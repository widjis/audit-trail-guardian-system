import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';
import sql from 'mssql';
import { microsoftGraphService } from '../services/microsoftGraphService.js';
import { getAdUserInfo } from './active-directory.js';
import { resolveSenderEmail } from '../utils/emailUtils.js';
import SystemConfigService from '../services/system-config-service.js';
import { getDbPool } from '../utils/dbConnection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize system config service with lazy loading
let systemConfigService = null;

const getSystemConfigService = () => {
  if (!systemConfigService) {
    const pool = getDbPool();
    if (pool) {
      systemConfigService = new SystemConfigService(pool);
    }
  }
  return systemConfigService;
};

// Data storage paths
const DATA_DIR = path.join(__dirname, '../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for reading/writing settings
const getSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
    return {
      accountStatuses: ["Pending", "Active", "Inactive", "Suspended"],
      mailingLists: {
        mandatory: [],
        optional: [
          { id: "1", name: "General Updates", email: "general@example.com", isDefault: true },
          { id: "2", name: "Technical Team", email: "tech@example.com", isDefault: false }
        ],
        roleBased: []
      },
      mailingListDisplayAsDropdown: true
    };
  } catch (err) {
    console.error('Error reading settings file:', err);
    throw err;
  }
};

const saveSettings = (settings) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing settings file:', err);
    throw err;
  }
};

// Get all settings
router.get('/', async (req, res) => {
  try {
    // Get settings from JSON for non-migrated settings
    const settings = getSettings();
    
    // Get departments from database
    try {
      const departments = await executeQuery('SELECT id, name, code FROM departments ORDER BY name');
      settings.departments = departments;
    } catch (dbError) {
      console.error('Error fetching departments from database:', dbError);
      // If database fails, use default departments or empty array
      if (!settings.departments) {
        settings.departments = [];
      }
    }
    
    // Get account statuses from database with fallback to JSON
    try {
      const accountStatuses = await executeQuery('SELECT name FROM account_statuses WHERE is_active = 1 ORDER BY sort_order, name');
      if (accountStatuses && accountStatuses.length > 0) {
        settings.accountStatuses = accountStatuses.map(status => status.name);
      }
    } catch (dbError) {
      console.error('Error fetching account statuses from database, using JSON fallback:', dbError);
      // Keep existing JSON data as fallback
    }
    
    // Get position grades from database with fallback to JSON
    try {
      const positionGrades = await executeQuery('SELECT name FROM position_grades WHERE is_active = 1 ORDER BY sort_order, name');
      if (positionGrades && positionGrades.length > 0) {
        settings.positionGrades = positionGrades.map(grade => grade.name);
      }
    } catch (dbError) {
      console.error('Error fetching position grades from database, using JSON fallback:', dbError);
      // Keep existing JSON data as fallback
    }
    
    // Get mailing lists from database with fallback to JSON
    try {
      const mailingLists = await executeQuery('SELECT name, email, type FROM mailing_lists WHERE is_active = 1 ORDER BY type, sort_order, name');
      if (mailingLists && mailingLists.length > 0) {
        const dbMailingLists = {
          mandatory: mailingLists.filter(ml => ml.type === 'mandatory').map(ml => ({ name: ml.name, email: ml.email })),
          optional: mailingLists.filter(ml => ml.type === 'optional').map(ml => ({ name: ml.name, email: ml.email })),
          roleBased: mailingLists.filter(ml => ml.type === 'role-based').map(ml => ({ name: ml.name, email: ml.email }))
        };
        settings.mailingLists = dbMailingLists;
      }
    } catch (dbError) {
      console.error('Error fetching mailing lists from database, using JSON fallback:', dbError);
      // Keep existing JSON data as fallback
    }
    
    // Get Active Directory settings from database
    try {
      const systemConfigService = getSystemConfigService();
      if (systemConfigService) {
        const adConfig = await systemConfigService.getActiveDirectoryConfig();
        if (adConfig) {
          settings.activeDirectorySettings = adConfig;
        }
      }
    } catch (dbError) {
      console.error('Error fetching Active Directory settings from database:', dbError);
      // Keep existing JSON data as fallback
    }
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings', message: err.message });
  }
});

// Update account statuses
router.put('/account-statuses', async (req, res) => {
  try {
    const { statuses } = req.body;
    
    if (!Array.isArray(statuses)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of statuses.' });
    }
    
    try {
      // Update database first
      // Get existing statuses
      const existingStatuses = await executeQuery('SELECT id, name FROM account_statuses');
      const existingNames = existingStatuses.map(status => status.name);
      
      // Process each status
      for (let i = 0; i < statuses.length; i++) {
        const statusName = statuses[i];
        if (existingNames.includes(statusName)) {
          // Update sort order for existing status
          await executeQuery(
            'UPDATE account_statuses SET sort_order = ?, is_active = 1 WHERE name = ?',
            [i, statusName]
          );
        } else {
          // Insert new status
          const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          await executeQuery(
            'INSERT INTO account_statuses (id, name, sort_order, is_active) VALUES (?, ?, ?, 1)',
            [id, statusName, i]
          );
        }
      }
      
      // Deactivate statuses not in the new list
      const statusesToDeactivate = existingNames.filter(name => !statuses.includes(name));
      for (const statusName of statusesToDeactivate) {
        await executeQuery(
          'UPDATE account_statuses SET is_active = 0 WHERE name = ?',
          [statusName]
        );
      }
      
      res.json({ success: true, message: 'Account statuses updated successfully in database' });
    } catch (dbError) {
      console.error('Database error updating account statuses, falling back to JSON:', dbError);
      
      // Fallback to JSON file
      const settings = getSettings();
      settings.accountStatuses = statuses;
      saveSettings(settings);
      
      res.json({ 
        success: true, 
        message: 'Account statuses updated in file storage due to database error',
        warning: dbError.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account statuses', message: err.message });
  }
});

// Update mailing lists - now supports new structure and database storage
router.put('/mailing-lists', async (req, res) => {
  try {
    const { mailingLists, displayAsDropdown } = req.body;
    let structuredMailingLists;
    
    // Support both old array format and new structured format
    if (Array.isArray(mailingLists)) {
      // Old format - convert to new structure
      structuredMailingLists = {
        mandatory: [],
        optional: mailingLists,
        roleBased: []
      };
    } else if (mailingLists && typeof mailingLists === 'object') {
      // New structured format
      const { mandatory, optional, roleBased } = mailingLists;
      
      if (!Array.isArray(mandatory) || !Array.isArray(optional) || !Array.isArray(roleBased)) {
        return res.status(400).json({ error: 'Invalid format. Expected structured mailing lists with mandatory, optional, and roleBased arrays.' });
      }
      
      structuredMailingLists = { mandatory, optional, roleBased };
    } else {
      return res.status(400).json({ error: 'Invalid format. Expected mailing lists data.' });
    }
    
    try {
      // Update database first
      // Get existing mailing lists
      const existingLists = await executeQuery('SELECT id, name, email, type FROM mailing_lists');
      
      // Process each type of mailing list
      const types = [
        { key: 'mandatory', dbType: 'mandatory' },
        { key: 'optional', dbType: 'optional' },
        { key: 'roleBased', dbType: 'role-based' }
      ];
      
      for (const typeInfo of types) {
        const lists = structuredMailingLists[typeInfo.key] || [];
        
        for (let i = 0; i < lists.length; i++) {
          const list = lists[i];
          const existing = existingLists.find(el => el.name === list.name && el.type === typeInfo.dbType);
          
          if (existing) {
            // Update existing list
            await executeQuery(
              'UPDATE mailing_lists SET email = ?, sort_order = ?, is_active = 1 WHERE id = ?',
              [list.email, i, existing.id]
            );
          } else {
            // Insert new list
            const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await executeQuery(
              'INSERT INTO mailing_lists (id, name, email, type, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)',
              [id, list.name, list.email, typeInfo.dbType, i]
            );
          }
        }
        
        // Deactivate lists of this type that are no longer in the new data
        const currentNames = lists.map(l => l.name);
        const listsToDeactivate = existingLists.filter(el => 
          el.type === typeInfo.dbType && !currentNames.includes(el.name)
        );
        
        for (const listToDeactivate of listsToDeactivate) {
          await executeQuery(
            'UPDATE mailing_lists SET is_active = 0 WHERE id = ?',
            [listToDeactivate.id]
          );
        }
      }
      
      // Update displayAsDropdown setting in JSON (this stays in JSON for now)
      if (displayAsDropdown !== undefined) {
        const settings = getSettings();
        settings.mailingListDisplayAsDropdown = displayAsDropdown;
        saveSettings(settings);
      }
      
      res.json({ success: true, message: 'Mailing lists updated successfully in database' });
    } catch (dbError) {
      console.error('Database error updating mailing lists, falling back to JSON:', dbError);
      
      // Fallback to JSON file
      const settings = getSettings();
      settings.mailingLists = structuredMailingLists;
      
      if (displayAsDropdown !== undefined) {
        settings.mailingListDisplayAsDropdown = displayAsDropdown;
      }
      
      saveSettings(settings);
      
      res.json({ 
        success: true, 
        message: 'Mailing lists updated in file storage due to database error',
        warning: dbError.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update mailing lists', message: err.message });
  }
});

// Update position grades
router.put('/position-grades', async (req, res) => {
  try {
    const { grades } = req.body;
    
    if (!Array.isArray(grades)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of position grades.' });
    }
    
    try {
      // Update database first
      // Get existing grades
      const existingGrades = await executeQuery('SELECT id, name FROM position_grades');
      const existingNames = existingGrades.map(grade => grade.name);
      
      // Process each grade
      for (let i = 0; i < grades.length; i++) {
        const gradeName = grades[i];
        if (existingNames.includes(gradeName)) {
          // Update sort order for existing grade
          await executeQuery(
            'UPDATE position_grades SET sort_order = ?, is_active = 1 WHERE name = ?',
            [i, gradeName]
          );
        } else {
          // Insert new grade
          const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          await executeQuery(
            'INSERT INTO position_grades (id, name, sort_order, is_active) VALUES (?, ?, ?, 1)',
            [id, gradeName, i]
          );
        }
      }
      
      // Deactivate grades not in the new list
      const gradesToDeactivate = existingNames.filter(name => !grades.includes(name));
      for (const gradeName of gradesToDeactivate) {
        await executeQuery(
          'UPDATE position_grades SET is_active = 0 WHERE name = ?',
          [gradeName]
        );
      }
      
      res.json({ success: true, message: 'Position grades updated successfully in database' });
    } catch (dbError) {
      console.error('Database error updating position grades, falling back to JSON:', dbError);
      
      // Fallback to JSON file
      const settings = getSettings();
      settings.positionGrades = grades;
      saveSettings(settings);
      
      res.json({ 
        success: true, 
        message: 'Position grades updated in file storage due to database error',
        warning: dbError.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update position grades', message: err.message });
  }
});

// Get license types
router.get('/license-types', async (req, res) => {
  try {
    const licenseTypes = await executeQuery('SELECT id, name, description FROM ms365_license_types ORDER BY name');
    res.json(licenseTypes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get license types', message: err.message });
  }
});

// Add license type
router.post('/license-types', async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await executeQuery(
      'INSERT INTO ms365_license_types (id, name, description) VALUES (?, ?, ?)',
      [id, name, description || null]
    );
    res.status(201).json({ id, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add license type', message: err.message });
  }
});

// Update license type
router.put('/license-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    await executeQuery(
      'UPDATE ms365_license_types SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    res.json({ id, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update license type', message: err.message });
  }
});

// Delete license type
router.delete('/license-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if this license type is being used by any hires
    const hires = await executeQuery(
      'SELECT COUNT(*) as count FROM hires WHERE microsoft_365_license = (SELECT name FROM ms365_license_types WHERE id = ?)',
      [id]
    );
    
    if (hires.length > 0 && hires[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete license type that is used by ${hires[0].count} hire(s)` 
      });
    }
    
    await executeQuery('DELETE FROM ms365_license_types WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete license type', message: err.message });
  }
});

// Update departments - now using database
router.put('/departments', async (req, res) => {
  try {
    const { departments } = req.body;
    
    if (!Array.isArray(departments)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of departments.' });
    }

    try {
      // Get existing departments from database to determine what to insert/update/delete
      const existingDepartments = await executeQuery('SELECT id FROM departments');
      const existingIds = existingDepartments.map(dept => dept.id);
      
      // Process each department without using transactions
      for (const dept of departments) {
        if (existingIds.includes(dept.id)) {
          // Update existing department
          await executeQuery(
            'UPDATE departments SET name = ?, code = ? WHERE id = ?',
            [dept.name, dept.code, dept.id]
          );
        } else {
          // Insert new department
          await executeQuery(
            'INSERT INTO departments (id, name, code) VALUES (?, ?, ?)',
            [dept.id, dept.name, dept.code]
          );
        }
      }
      
      // Delete departments that no longer exist
      const currentIds = departments.map(dept => dept.id);
      const idsToDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (idsToDelete.length > 0) {
        // Check if any employees are using these departments before deleting
        for (const id of idsToDelete) {
          const dept = existingDepartments.find(d => d.id === id);
          if (dept) {
            const deptName = await executeQuery('SELECT name FROM departments WHERE id = ?', [id]);
            if (deptName.length > 0) {
              const hires = await executeQuery('SELECT COUNT(*) as count FROM hires WHERE department = ?', [deptName[0].name]);
              if (hires.length > 0 && hires[0].count > 0) {
                return res.status(400).json({ 
                  error: `Cannot delete department that is used by ${hires[0].count} employee(s)` 
                });
              }
            }
          }
        }
        
        // Safe to delete
        for (const id of idsToDelete) {
          await executeQuery('DELETE FROM departments WHERE id = ?', [id]);
        }
      }
      
      res.json({ success: true, message: 'Departments updated successfully' });
    } catch (dbError) {
      console.error('Database error updating departments:', dbError);
      
      // Fallback to file storage if database fails
      const settings = getSettings();
      settings.departments = departments;
      saveSettings(settings);
      
      res.json({ 
        success: true, 
        message: 'Departments updated in file storage due to database error',
        warning: dbError.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update departments', message: err.message });
  }
});

// Add this to your existing routes
router.get('/whatsapp', async (req, res) => {
  try {
    // Get WhatsApp settings from database
    const whatsappSettings = await getSystemConfigService().getWhatsAppConfig();
    
    if (!whatsappSettings) {
      // Return default values if no settings found
      const defaultSettings = {
        apiUrl: '',
        testNumber: '',
        defaultMessage: `Welcome aboard to PT. Merdeka Tsingshan Indonesia. 
By this message, we inform you regarding your account information for the email address: {{email}}
Name: {{name}}
Title: {{title}}
Department: {{department}}
Email: {{email}}
Password: {{password}}

Please don't hesitate to contact IT for any question.`,
        defaultRecipient: 'userNumber',
        newHireNotificationEnabled: false,
        newHireNotificationTemplate: `🎉 New Hire Alert!

A new employee is joining us:

Name: {{name}}
Title: {{title}}
Department: {{department}}
Start Date: {{startDate}}
Email: {{email}}

License request has been successfully sent to the IT team.`,
        newHireNotificationRecipients: []
      };
      return res.json(defaultSettings);
    }
    
    res.json(whatsappSettings);
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
  }
});

router.put('/whatsapp', async (req, res) => {
  try {
    const { 
      apiUrl, 
      testNumber,
      defaultMessage, 
      defaultRecipient,
      newHireNotificationEnabled,
      newHireNotificationTemplate,
      newHireNotificationRecipients,
      groupNotificationEnabled,
      groupId,
      groupName,
      groupMentions
    } = req.body;
    
    const systemConfigService = getSystemConfigService();
    
    // Update each WhatsApp configuration item
    const configUpdates = [
      { key: 'whatsapp.api_url', name: 'WhatsApp API URL', value: apiUrl || '' },
      { key: 'whatsapp.test_number', name: 'WhatsApp Test Number', value: testNumber || '' },
      { key: 'whatsapp.default_message', name: 'WhatsApp Default Message', value: defaultMessage || '' },
      { key: 'whatsapp.default_recipient', name: 'WhatsApp Default Recipient', value: defaultRecipient || 'userNumber' },
      { key: 'whatsapp.new_hire_notification_enabled', name: 'New Hire Notification Enabled', value: newHireNotificationEnabled || false },
      { key: 'whatsapp.new_hire_notification_template', name: 'New Hire Notification Template', value: newHireNotificationTemplate || '' },
      { key: 'whatsapp.new_hire_notification_recipients', name: 'New Hire Notification Recipients', value: JSON.stringify(newHireNotificationRecipients || []) },
      { key: 'whatsapp.group_notification_enabled', name: 'Group Notification Enabled', value: groupNotificationEnabled || false },
      { key: 'whatsapp.group_id', name: 'WhatsApp Group ID', value: groupId || '' },
      { key: 'whatsapp.group_name', name: 'WhatsApp Group Name', value: groupName || '' },
      { key: 'whatsapp.group_mentions', name: 'WhatsApp Group Mentions', value: JSON.stringify(groupMentions || []) }
    ];
    
    // Update all configurations
    for (const update of configUpdates) {
      await systemConfigService.setConfig(
        update.key,
        update.value,
        update.name,
        'whatsapp',
        false,
        false,
        req.user?.username || 'settings_api'
      );
    }
    
    // Return the updated settings
    const updatedSettings = {
      apiUrl,
      testNumber: testNumber || '',
      defaultMessage,
      defaultRecipient: defaultRecipient || 'userNumber',
      newHireNotificationEnabled: newHireNotificationEnabled || false,
      newHireNotificationTemplate,
      newHireNotificationRecipients: newHireNotificationRecipients || [],
      groupNotificationEnabled: groupNotificationEnabled || false,
      groupId: groupId || '',
      groupName: groupName || '',
      groupMentions: groupMentions || []
    };
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to update WhatsApp settings' });
  }
});

// Add routes for Active Directory settings
router.get('/active-directory', (req, res) => {
  try {
    const settings = getSettings();
    const adSettings = settings.activeDirectorySettings || {
      server: '',
      username: '',
      password: '',
      domain: '',
      baseDN: '',
      enabled: false,
      protocol: 'ldap',
      authFormat: 'userPrincipalName'
    };
    
    res.json(adSettings);
  } catch (error) {
    console.error('Error fetching Active Directory settings:', error);
    res.status(500).json({ error: 'Failed to fetch Active Directory settings' });
  }
});

router.put('/active-directory', (req, res) => {
  try {
    const { server, username, password, domain, baseDN, enabled, protocol, authFormat } = req.body;
    
    const settings = getSettings();
    settings.activeDirectorySettings = {
      server,
      username,
      password,
      domain,
      baseDN,
      enabled,
      protocol: protocol || 'ldap',
      authFormat: authFormat || 'userPrincipalName'
    };
    
    saveSettings(settings);
    
    res.json(settings.activeDirectorySettings);
  } catch (error) {
    console.error('Error updating Active Directory settings:', error);
    res.status(500).json({ error: 'Failed to update Active Directory settings' });
  }
});

// Add endpoints for HRIS database configuration
router.get('/hris-database', (req, res) => {
  try {
    const settings = getSettings();
    const hrisDbConfig = settings.hrisDbConfig || {
      server: '',
      port: '1433',
      database: '',
      username: '',
      password: '',
      enabled: false
    };
    
    res.json(hrisDbConfig);
  } catch (error) {
    console.error('Error fetching HRIS database config:', error);
    res.status(500).json({ error: 'Failed to fetch HRIS database configuration' });
  }
});

router.put('/hris-database', (req, res) => {
  try {
    const { server, port, database, username, password, enabled } = req.body;
    
    const settings = getSettings();
    settings.hrisDbConfig = {
      server,
      port,
      database,
      username,
      password,
      enabled
    };
    
    saveSettings(settings);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating HRIS database config:', error);
    res.status(500).json({ error: 'Failed to update HRIS database configuration' });
  }
});

// Test HRIS database connection
router.post('/hris-database/test-connection', async (req, res) => {
  const { server, port, database, username, password } = req.body;
  
  try {
    // Configure SQL Server connection
    const config = {
      server,
      port: parseInt(port) || 1433,
      database,
      user: username,
      password,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000
      }
    };
    
    // Test connection
    let pool = null;
    try {
      pool = await new sql.ConnectionPool(config).connect();
      await pool.request().query('SELECT 1 as testConnection');
      
      res.json({ 
        success: true, 
        message: `Successfully connected to ${database} on ${server}:${port}`
      });
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  } catch (error) {
    console.error('HRIS database connection test failed:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Failed to connect to HRIS database', 
      error: error.message 
    });
  }
});

// Add routes for Exchange Online settings - updated for basic auth
router.get('/exchange-online', (req, res) => {
  try {
    const settings = getSettings();
    const exchangeSettings = settings.exchangeOnlineSettings || {
      enabled: false,
      username: '',
      passwordConfigured: false
    };
    
    // Always get the username from environment variable on the server
    const envUsername = process.env.EXO_USER || '';
    exchangeSettings.username = envUsername;
    
    console.log('Exchange Online settings requested:', {
      username: envUsername ? 'Set' : 'Not set',
      passwordConfigured: exchangeSettings.passwordConfigured
    });
    
    res.json(exchangeSettings);
  } catch (error) {
    console.error('Error fetching Exchange Online settings:', error);
    res.status(500).json({ error: 'Failed to fetch Exchange Online settings' });
  }
});

router.put('/exchange-online', (req, res) => {
  try {
    const { enabled, username, passwordConfigured, lastConnectionTest } = req.body;
    
    const settings = getSettings();
    settings.exchangeOnlineSettings = {
      enabled,
      username: username || process.env.EXO_USER || '',
      passwordConfigured: passwordConfigured || false,
      lastConnectionTest
    };
    
    saveSettings(settings);
    
    res.json(settings.exchangeOnlineSettings);
  } catch (error) {
    console.error('Error updating Exchange Online settings:', error);
    res.status(500).json({ error: 'Failed to update Exchange Online settings' });
  }
});

// Microsoft Graph settings routes
router.get('/microsoft-graph', async (req, res) => {
  try {
    let microsoftGraphSettings;
    
    try {
      // Try to get from database first
      const configService = getSystemConfigService();
      if (configService) {
        microsoftGraphSettings = await configService.getMicrosoftGraphConfig();
        console.log('Microsoft Graph settings retrieved from database');
      } else {
        console.warn('Database connection not available, using JSON fallback');
        microsoftGraphSettings = null;
      }
    } catch (dbError) {
      console.error('Error getting Microsoft Graph settings from database, falling back to JSON:', dbError);
      microsoftGraphSettings = null;
    }
    
    // Fallback to JSON file if database fails or no config found
      if (!microsoftGraphSettings) {
        const settings = await getSettings();
        microsoftGraphSettings = settings.microsoftGraphSettings || {
          enabled: false,
          clientId: '',
          clientSecret: '',
          tenantId: '',
          authority: '',
          scope: ["https://graph.microsoft.com/.default"],
          defaultToRecipients: [],
          defaultCcRecipients: [],
          defaultBccRecipients: [],
          senderEmail: '',
          useLoggedInUserAsSender: false,
          emailSubjectTemplate: 'License Request for {{hireCount}} New Employees',
          emailBodyTemplate: `Dear IT Team,

I hope this email finds you well. I am writing to request Microsoft 365 license assignments for the following new employees who have recently joined our organization:

{{hireDetails}}

Please process these license assignments at your earliest convenience. If you need any additional information or have questions regarding these requests, please don't hesitate to contact me.

Thank you for your assistance.

Best regards,
HR Department`
        };
        console.log('Microsoft Graph settings retrieved from JSON fallback');
      }
    
    res.json(microsoftGraphSettings);
  } catch (error) {
    console.error('Error getting Microsoft Graph settings:', error);
    res.status(500).json({ error: 'Failed to get Microsoft Graph settings' });
  }
});

router.put('/microsoft-graph', async (req, res) => {
  try {
    const graphSettings = req.body;
    const updatedBy = req.user?.username || 'system';
    
    // Map of frontend keys to database keys
    const configMapping = {
      enabled: 'msgraph.enabled',
      tenantId: 'msgraph.tenant_id',
      clientId: 'msgraph.client_id',
      clientSecret: 'msgraph.client_secret',
      scope: 'msgraph.scope',
      defaultToRecipients: 'msgraph.default_to_recipients',
      defaultCcRecipients: 'msgraph.default_cc_recipients',
      defaultBccRecipients: 'msgraph.default_bcc_recipients',
      senderEmail: 'msgraph.sender_email',
      useLoggedInUserAsSender: 'msgraph.use_logged_in_user_as_sender',
      emailSubjectTemplate: 'msgraph.email_subject_template',
      emailBodyTemplate: 'msgraph.email_body_template'
    };
    
    try {
      const configService = getSystemConfigService();
      if (!configService) {
        throw new Error('Database connection not available');
      }
      
      // Update each configuration in the database
      for (const [frontendKey, dbKey] of Object.entries(configMapping)) {
        if (graphSettings.hasOwnProperty(frontendKey)) {
          let value = graphSettings[frontendKey];
          
          // Convert arrays to JSON strings for storage
          if (Array.isArray(value)) {
            value = JSON.stringify(value);
          }
          
          await configService.updateConfig(dbKey, value, updatedBy);
        }
      }
      
      console.log('Microsoft Graph settings updated in database');
      res.json({ success: true, message: 'Microsoft Graph settings updated successfully', data: graphSettings });
      
    } catch (dbError) {
      console.error('Database error updating Microsoft Graph settings, falling back to JSON:', dbError);
      
      // Fallback to JSON file
      const settings = await getSettings();
      settings.microsoftGraphSettings = graphSettings;
      await saveSettings(settings);
      
      res.json({ 
        success: true, 
        message: 'Microsoft Graph settings updated in file storage due to database error',
        warning: dbError.message,
        data: graphSettings
      });
    }
    
  } catch (error) {
    console.error('Error updating Microsoft Graph settings:', error);
    res.status(500).json({ error: 'Failed to update Microsoft Graph settings', message: error.message });
  }
});

router.post('/microsoft-graph/test-connection', async (req, res) => {
  try {
    const settings = req.body;
    
    if (!settings.clientId || !settings.clientSecret || !settings.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, clientSecret, or tenantId'
      });
    }

    console.log('Testing Microsoft Graph connection with provided settings...');
    const result = await microsoftGraphService.testConnection(settings);
    
    // Update last connection test timestamp if successful
    if (result.success) {
      try {
        // Try to update in database first
        const configService = getSystemConfigService();
        if (configService) {
          await configService.updateConfig(
            'msgraph.last_connection_test', 
            new Date().toISOString(),
            req.user?.username || 'system'
          );
          console.log('Updated last connection test timestamp in database');
        } else {
          throw new Error('Database connection not available');
        }
      } catch (dbError) {
        console.error('Failed to update last connection test in database, falling back to JSON:', dbError);
        
        // Fallback to JSON file
        const currentSettings = getSettings();
        currentSettings.microsoftGraphSettings = {
          ...currentSettings.microsoftGraphSettings,
          lastConnectionTest: new Date().toISOString()
        };
        saveSettings(currentSettings);
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error testing Microsoft Graph connection:', error);
    res.json({
      success: false,
      message: 'Connection test failed: ' + error.message
    });
  }
});

router.post('/microsoft-graph/send-license-request', async (req, res) => {
  try {
    const { recipients, ccRecipients, bccRecipients, hires, includeAttachments } = req.body;
    
    // Get Microsoft Graph settings from database instead of JSON file
    const configService = getSystemConfigService();
    const graphSettings = configService ? await configService.getMicrosoftGraphConfig() : null;
    const adSettings = configService ? await configService.getActiveDirectoryConfig() : null;
    
    if (!graphSettings) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load Microsoft Graph configuration from database'
      });
    }
    let signature = '';

    if (req.user?.username && adSettings?.enabled) {
      try {
        const info = await getAdUserInfo(adSettings, req.user.username);
        signature = `Best regards,<br>${info.displayName}<br>${info.title} | ${info.department}`;
        console.log('Generated signature:', signature.replace(/<br>/g, ' | '));
      } catch (err) {
        console.error('Failed to fetch AD user info:', err);
      }
    } else {
      console.log('Signature could not be generated from AD information');
    }

    console.log('=== Microsoft Graph License Request Start ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('includeAttachments flag:', includeAttachments);
    console.log('includeAttachments type:', typeof includeAttachments);
    console.log('Number of hires:', hires?.length || 0);

    // Log each hire's SRF information upfront
    if (hires && hires.length > 0) {
      console.log('\n=== Hire SRF Information ===');
      hires.forEach((hire, index) => {
        console.log(`Hire ${index + 1}: ${hire.name}`);
        console.log(`  - srf_document_path: ${hire.srf_document_path || 'NOT SET'}`);
        console.log(`  - srf_document_name: ${hire.srf_document_name || 'NOT SET'}`);
        console.log(`  - Has SRF data: ${!!(hire.srf_document_path && hire.srf_document_name)}`);
      });
    }

    if (!graphSettings?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Microsoft Graph integration is not enabled'
      });
    }

    // Use recipients from request or fall back to settings defaults
    const finalToRecipients = recipients && recipients.length > 0 ? recipients : graphSettings.defaultToRecipients || [];
    const finalCcRecipients = ccRecipients && ccRecipients.length > 0 ? ccRecipients : graphSettings.defaultCcRecipients || [];
    const finalBccRecipients = bccRecipients && bccRecipients.length > 0 ? bccRecipients : graphSettings.defaultBccRecipients || [];

    if (finalToRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recipients specified. Please configure default recipients in settings or provide recipients in the request.'
      });
    }

    // Process SRF attachments if requested
    let attachments = [];
    
    console.log('\n=== Attachment Processing Decision ===');
    console.log('includeAttachments flag is:', includeAttachments);
    console.log('Will process attachments:', !!includeAttachments);
    
    if (includeAttachments) {
      console.log('=== SRF Attachment Processing Start ===');
      console.log('Processing SRF attachments for email...');
      
      for (const hire of hires) {
        console.log(`\n--- Processing hire: ${hire.name} ---`);
        console.log('Hire ID:', hire.id);
        console.log('SRF document path from DB:', hire.srf_document_path);
        console.log('SRF document name from DB:', hire.srf_document_name);
        
        if (hire.srf_document_path && hire.srf_document_name) {
          try {
            let fullSrfPath;
            
            // Check if the stored path is already absolute (Windows or Unix)
            if (path.isAbsolute(hire.srf_document_path)) {
              // Use the absolute path directly
              fullSrfPath = path.resolve(hire.srf_document_path);
              console.log('Using absolute path from database:', fullSrfPath);
            } else {
              // Construct relative path from server directory
              fullSrfPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', hire.srf_document_path);
              console.log('Constructed relative path:', fullSrfPath);
            }
            
            console.log('Final resolved SRF file path:', fullSrfPath);
            console.log('SRF file exists:', fs.existsSync(fullSrfPath));
            
            if (fs.existsSync(fullSrfPath)) {
              console.log('Reading SRF file...');
              
              // Get file stats
              const fileStats = fs.statSync(fullSrfPath);
              console.log('File size:', fileStats.size, 'bytes');
              console.log('File modified:', fileStats.mtime);
              
              // Read file and convert to base64
              const fileBuffer = fs.readFileSync(fullSrfPath);
              console.log('File buffer length:', fileBuffer.length);
              
              const base64Content = fileBuffer.toString('base64');
              console.log('Base64 content length:', base64Content.length);
              console.log('Base64 content preview (first 100 chars):', base64Content.substring(0, 100));
              
              // Use the original filename from database for attachment
              const attachmentFilename = `SRF_${hire.name.replace(/\s+/g, '_')}.pdf`;
              console.log('Attachment filename:', attachmentFilename);
              console.log('Original filename from DB:', hire.srf_document_name);
              
              attachments.push({
                filename: attachmentFilename,
                content: base64Content,
                contentType: 'application/pdf'
              });
              
              console.log(`✓ Successfully added SRF attachment for ${hire.name}`);
            } else {
              console.log(`✗ SRF file not found at resolved path: ${fullSrfPath}`);
              console.log(`Original database path was: ${hire.srf_document_path}`);
              console.log(`Path is absolute: ${path.isAbsolute(hire.srf_document_path)}`);
            }
          } catch (error) {
            console.error(`✗ Error processing SRF attachment for ${hire.name}:`, error.message);
            console.error('Error stack:', error.stack);
            // Continue processing other attachments even if one fails
          }
        } else {
          console.log(`⚠ Hire ${hire.name} missing SRF document path or name in database`);
          console.log('srf_document_path:', hire.srf_document_path || 'NOT SET');
          console.log('srf_document_name:', hire.srf_document_name || 'NOT SET');
        }
      }
      
      console.log(`\n=== SRF Processing Complete ===`);
      console.log(`Total SRF attachments processed: ${attachments.length}`);
      console.log('Attachment filenames:', attachments.map(a => a.filename));
    } else {
      console.log('includeAttachments is false/undefined, skipping SRF processing');
    }

    // Generate email content from template using HTML table format (same as preview)
    const hireCount = hires.length;
    const hireDate = new Date().toLocaleDateString();
    
    // Format hire details as HTML table - FIXED: removed all unnecessary whitespace
    const hireDetailsHtml = `<table border="1" style="border-collapse: collapse; width: 100%; margin: 20px 0;"><thead><tr style="background-color: #f2f2f2;"><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">No.</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Name</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Position</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Department</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Email</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">License Type</th></tr></thead><tbody>${hires.map((hire, index) => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.name}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.title}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.department}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.email}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.microsoft_365_license}</td></tr>`).join('')}</tbody></table>`;

    // Replace template variables
    const subject = (graphSettings.emailSubjectTemplate || 'License Request for {{hireCount}} New Employees')
      .replace(/\{\{hireCount\}\}/g, hireCount.toString())
      .replace(/\{\{hireDate\}\}/g, hireDate);

    const bodyTemplate = (graphSettings.emailBodyTemplate || 'License request for new employees:\n\n{{hireDetails}}')
      .replace(/\{\{hireDetails\}\}/g, hireDetailsHtml)
      .replace(/\{\{hireCount\}\}/g, hireCount.toString())
      .replace(/\{\{hireDate\}\}/g, hireDate)
      .replace(/\{\{signature\}\}/g, signature);

    // Fixed line break processing - split by double newlines to create paragraphs
    const paragraphs = bodyTemplate.split(/\n\n+/);
    const body = paragraphs
      .map(paragraph => paragraph.replace(/\n/g, '<br>')) // Convert single newlines to <br>
      .map(paragraph => `<p>${paragraph}</p>`) // Wrap each paragraph in <p> tags
      .join(''); // Join without extra spacing

    // Determine sender email
    const senderEmail = await resolveSenderEmail(
      graphSettings,
      adSettings,
      req,
      getAdUserInfo
    );

    const emailData = {
      recipients: finalToRecipients,
      ccRecipients: finalCcRecipients.length > 0 ? finalCcRecipients : undefined,
      bccRecipients: finalBccRecipients.length > 0 ? finalBccRecipients : undefined,
      subject: subject,
      body: {
        contentType: 'HTML', // Changed from 'Text' to 'HTML'
        content: body
      },
      senderEmail: senderEmail,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    console.log('\n=== Email Data Summary ===');
    console.log('Recipients count:', finalToRecipients.length);
    console.log('CC recipients count:', finalCcRecipients.length);
    console.log('BCC recipients count:', finalBccRecipients.length);
    console.log('Subject:', subject);
    console.log('Body content type:', emailData.body.contentType);
    console.log('Body length:', emailData.body.content.length);
    console.log('Attachments included:', !!emailData.attachments);
    console.log('Attachments count:', emailData.attachments?.length || 0);
    
    if (emailData.attachments && emailData.attachments.length > 0) {
      console.log('Attachment details:');
      emailData.attachments.forEach((att, index) => {
        console.log(`  ${index + 1}. ${att.filename} (${att.contentType}, ${att.content.length} chars)`);
      });
    }

    console.log('\n=== Sending email with Microsoft Graph ===');
    const result = await microsoftGraphService.sendEmail(graphSettings, emailData);
    
    if (result.success) {
      const totalRecipients = finalToRecipients.length + finalCcRecipients.length + finalBccRecipients.length;
      const attachmentInfo = attachments.length > 0 ? ` with ${attachments.length} SRF attachment(s)` : '';
      console.log(`✓ Email sent successfully to ${totalRecipients} recipient(s)${attachmentInfo}`);
      
      // Create audit log entries for each hire's license request
      try {
        const db = getDatabase();
        const performedBy = req.user?.username || 'system';
        const timestamp = new Date().toISOString();
        
        for (const hire of hires) {
          const auditDetails = {
            action: 'LICENSE_REQUEST_EMAIL_SENT',
            hire_name: hire.name,
            hire_email: hire.email,
            license_type: hire.microsoft_365_license,
            recipients: {
              to: finalToRecipients,
              cc: finalCcRecipients,
              bcc: finalBccRecipients
            },
            attachments_included: attachments.length > 0,
            attachment_count: attachments.length,
            email_subject: subject,
            performed_by: performedBy,
            timestamp: timestamp
          };
          
          await db.run(
            `INSERT INTO audit_logs (hire_id, action, details, performed_by, created_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [hire.id, 'LICENSE_REQUEST_EMAIL', JSON.stringify(auditDetails), performedBy, timestamp]
          );
          
          console.log(`✓ Audit log created for license request: ${hire.name}`);
        }
        
        console.log(`✓ Created ${hires.length} audit log entries for license requests`);
      } catch (auditError) {
        console.error('Failed to create audit logs for license requests:', auditError);
        // Don't fail the entire request if audit logging fails
      }
      
      res.json({
        success: true,
        message: `License request email sent successfully to ${totalRecipients} recipient(s)${attachmentInfo}`,
        sentCount: hires.length,
        attachmentCount: attachments.length,
        recipients: {
          to: finalToRecipients,
          cc: finalCcRecipients,
          bcc: finalBccRecipients
        }
      });
    } else {
      console.log('✗ Email sending failed:', result.message);
      
      // Create audit log entries for failed license requests
      try {
        const db = getDatabase();
        const performedBy = req.user?.username || 'system';
        const timestamp = new Date().toISOString();
        
        for (const hire of hires) {
          const auditDetails = {
            action: 'LICENSE_REQUEST_EMAIL_FAILED',
            hire_name: hire.name,
            hire_email: hire.email,
            license_type: hire.microsoft_365_license,
            error_message: result.message,
            performed_by: performedBy,
            timestamp: timestamp
          };
          
          await db.run(
            `INSERT INTO audit_logs (hire_id, action, details, performed_by, created_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [hire.id, 'LICENSE_REQUEST_EMAIL_FAILED', JSON.stringify(auditDetails), performedBy, timestamp]
          );
        }
        
        console.log(`✓ Created ${hires.length} audit log entries for failed license requests`);
      } catch (auditError) {
        console.error('Failed to create audit logs for failed license requests:', auditError);
      }
      
      res.json({
        success: false,
        message: result.message || 'Failed to send license request email'
      });
    }
  } catch (error) {
    console.error('=== Email Sending Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to send license request email: ' + error.message
    });
  }
});

router.post('/microsoft-graph/email-template-preview', async (req, res) => {
  try {
    const { hires } = req.body;
    
    // Get Microsoft Graph settings from database instead of JSON file
    const configService = getSystemConfigService();
    const graphSettings = configService ? await configService.getMicrosoftGraphConfig() : null;
    const adSettings = configService ? await configService.getActiveDirectoryConfig() : null;
    
    if (!graphSettings) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load Microsoft Graph configuration from database'
      });
    }

    let signature = '';
    if (req.user?.username && adSettings?.enabled) {
      try {
        const info = await getAdUserInfo(adSettings, req.user.username);
        signature = `Best regards,<br>${info.displayName} | ${info.title}<br>${info.department}`;
        console.log('Generated signature:', signature.replace(/<br>/g, ' | '));
      } catch (err) {
        console.error('Failed to fetch AD user info:', err);
      }
    } else {
      console.log('Signature could not be generated from AD information');
    }

    // Format hire details as HTML table - FIXED: removed all unnecessary whitespace
    const hireDetailsHtml = `<table border="1" style="border-collapse: collapse; width: 100%; margin: 20px 0;"><thead><tr style="background-color: #f2f2f2;"><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">No.</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Name</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Position</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Department</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Email</th><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">License Type</th></tr></thead><tbody>${hires.map((hire, index) => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.name}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.title}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.department}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.email}</td><td style="padding: 8px; border: 1px solid #ddd;">${hire.microsoft_365_license}</td></tr>`).join('')}</tbody></table>`;

    // Get current date for template substitution
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Apply template substitution with improved line break handling
    const subject = (graphSettings?.emailSubjectTemplate || 'License Request for {{hireCount}} New Employees')
      .replace('{{hireCount}}', hires.length.toString())
      .replace('{{hireDate}}', currentDate);

    const bodyTemplate = (graphSettings?.emailBodyTemplate || 'License request for new employees:\n\n{{hireDetails}}')
      .replace('{{hireDetails}}', hireDetailsHtml)
      .replace('{{hireCount}}', hires.length.toString())
      .replace('{{hireDate}}', currentDate)
      .replace('{{signature}}', signature);

    // Fixed line break processing - split by double newlines to create paragraphs
    const paragraphs = bodyTemplate.split(/\n\n+/);
    const body = paragraphs
      .map(paragraph => paragraph.replace(/\n/g, '<br>')) // Convert single newlines to <br>
      .map(paragraph => `<p>${paragraph}</p>`) // Wrap each paragraph in <p> tags
      .join(''); // Join without extra spacing

    res.json({
      subject,
      body
    });

  } catch (error) {
    console.error('Error generating email template preview:', error);
    res.status(500).json({
      error: 'Failed to generate email template preview'
    });
  }
});

// Welcome Card Email endpoint
router.post('/microsoft-graph/send-welcome-card', async (req, res) => {
  try {
    const { fromEmail, toEmail, subject, htmlContent } = req.body;

    // Validate required fields
    if (!fromEmail || !toEmail || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fromEmail, toEmail, subject, or htmlContent'
      });
    }

    // Get Microsoft Graph settings from database
    const configService = getSystemConfigService();
    const graphSettings = configService ? await configService.getMicrosoftGraphConfig() : null;
    
    if (!graphSettings) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load Microsoft Graph configuration from database'
      });
    }

    if (!graphSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Microsoft Graph is not enabled'
      });
    }

    // Prepare email data for Microsoft Graph (using the same format as license request)
    const emailData = {
      recipients: [toEmail], // Array of email addresses
      subject: subject,
      body: {
        contentType: 'HTML',
        content: htmlContent
      },
      senderEmail: fromEmail
    };

    console.log('\n=== Sending Welcome Card Email with Microsoft Graph ===');
    console.log('From:', fromEmail);
    console.log('To:', toEmail);
    console.log('Subject:', subject);

    // Send email using Microsoft Graph service
    const result = await microsoftGraphService.sendEmail(graphSettings, emailData);
    
    if (result.success) {
      console.log('✓ Welcome card email sent successfully');
      
      res.json({
        success: true,
        message: 'Welcome card email sent successfully',
        recipient: toEmail
      });
    } else {
      console.log('✗ Welcome card email sending failed:', result.message);
      res.json({
        success: false,
        message: result.message || 'Failed to send welcome card email'
      });
    }
  } catch (error) {
    console.error('=== Welcome Card Email Sending Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome card email: ' + error.message
    });
  }
});

// AI Services settings routes
router.get('/ai-services', async (req, res) => {
  try {
    const systemConfigService = getSystemConfigService();
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    // Get AI services configuration from database
    const aiConfig = await systemConfigService.getAIServicesConfig();
    
    if (!aiConfig) {
      // Return default configuration if none exists
      return res.json({
        geminiApiKey: '',
        enabled: false,
        model: 'gemini-2.0-flash',
        maxTokens: 2048,
        temperature: 0.7,
        cvAnalysisPrompt: `Please analyze this CV/resume and provide detailed insights in the following areas:

1. **Professional Profile**: Summarize the candidate's overall professional background and career level.

2. **Key Competencies**: List the main technical skills, soft skills, and areas of expertise.

3. **Career Highlights**: Identify notable achievements, career progression, and standout experiences.

4. **Educational Background**: Summarize educational qualifications and relevant certifications.

5. **Position Relevance**: Assess how well the candidate's background aligns with typical organizational needs.

6. **Personalization Insights**: Identify unique aspects of their background that could be mentioned in a personalized welcome message.

Please provide a structured analysis that will help create a personalized and engaging welcome email for this new team member.`,
        emailComposerPrompt: `Based on the CV analysis provided, create a warm and personalized welcome email for our new team member. The email should:

1. **Personal Welcome**: Reference specific aspects of their background that show we've taken time to learn about them.

2. **Role Alignment**: Connect their experience and skills to how they'll contribute to our team.

3. **Company Culture**: Convey our company's welcoming culture and values.

4. **Next Steps**: Include practical information about their first day and onboarding process.

5. **Tone**: Professional yet warm, enthusiastic but not overwhelming.

Please generate both a subject line and email body that feels genuine and personalized, avoiding generic corporate language. The email should make the new hire feel valued and excited about joining our team.

New hire information: {newHireInfo}
CV Analysis: {cvAnalysis}`
      });
    }

    res.json(aiConfig);
  } catch (error) {
    console.error('Error fetching AI services settings:', error);
    res.status(500).json({ error: 'Failed to fetch AI services settings' });
  }
});

router.put('/ai-services', async (req, res) => {
  try {
    const { geminiApiKey, enabled, model, maxTokens, temperature, cvAnalysisPrompt, emailComposerPrompt } = req.body;
    const updatedBy = req.user?.username || 'system';

    // Validate required fields
    if (enabled && !geminiApiKey) {
      return res.status(400).json({ error: 'API Key is required when AI Services is enabled' });
    }

    // Validate model
    const validModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
    if (model && !validModels.includes(model)) {
      return res.status(400).json({ error: 'Invalid model selected' });
    }

    // Validate maxTokens
    if (maxTokens && (maxTokens < 256 || maxTokens > 8192)) {
      return res.status(400).json({ error: 'Max tokens must be between 256 and 8192' });
    }

    // Validate temperature
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
    }

    const systemConfigService = getSystemConfigService();
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    // Map of frontend keys to database keys
    const configMapping = {
      enabled: 'ai.enabled',
      geminiApiKey: 'ai.gemini_api_key',
      model: 'ai.model',
      maxTokens: 'ai.max_tokens',
      temperature: 'ai.temperature',
      cvAnalysisPrompt: 'ai.cv_analysis_prompt',
      emailComposerPrompt: 'ai.email_composer_prompt'
    };

    // Update each configuration
    for (const [frontendKey, dbKey] of Object.entries(configMapping)) {
      const value = req.body[frontendKey];
      if (value !== undefined) {
        const isEncrypted = frontendKey === 'geminiApiKey'; // Encrypt API key
        await systemConfigService.setConfig(
          dbKey,
          value,
          `AI Services ${frontendKey}`,
          'ai_services',
          isEncrypted,
          isEncrypted, // Mark as sensitive if encrypted
          updatedBy
        );
      }
    }

    // Return updated configuration
    const updatedConfig = await systemConfigService.getAIServicesConfig();
    res.json(updatedConfig);

  } catch (error) {
    console.error('Error updating AI services settings:', error);
    res.status(500).json({ error: 'Failed to update AI services settings' });
  }
});

router.post('/ai-services/test-connection', async (req, res) => {
  try {
    const { geminiApiKey, model } = req.body;

    if (!geminiApiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API Key is required for testing' 
      });
    }

    // Test the Gemini API connection
    const testPrompt = 'Hello, this is a test message. Please respond with "Connection successful".';
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: testPrompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Update last connection test timestamp
        const systemConfigService = getSystemConfigService();
        if (systemConfigService) {
          await systemConfigService.setConfig(
            'ai.last_connection_test',
            new Date().toISOString(),
            'AI Services last connection test',
            'ai_services',
            false,
            false,
            req.user?.username || 'system'
          );
        }

        res.json({
          success: true,
          message: `Connection successful! Model responded: "${generatedText.substring(0, 100)}${generatedText.length > 100 ? '...' : ''}"`
        });
      } else {
        res.json({
          success: false,
          message: 'API responded but no content was generated'
        });
      }

    } catch (apiError) {
      console.error('Gemini API test error:', apiError);
      res.json({
        success: false,
        message: `API connection failed: ${apiError.message}`
      });
    }

  } catch (error) {
    console.error('Error testing AI services connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection: ' + error.message
    });
  }
});

export default router;
