import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';
import sql from 'mssql';
import { microsoftGraphService } from '../services/microsoftGraphService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

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
    // Get settings from JSON for non-department settings
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
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings', message: err.message });
  }
});

// Update account statuses
router.put('/account-statuses', (req, res) => {
  try {
    const { statuses } = req.body;
    
    if (!Array.isArray(statuses)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of statuses.' });
    }
    
    const settings = getSettings();
    settings.accountStatuses = statuses;
    
    saveSettings(settings);
    
    res.json({ success: true, message: 'Account statuses updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account statuses', message: err.message });
  }
});

// Update mailing lists - now supports new structure
router.put('/mailing-lists', (req, res) => {
  try {
    const { mailingLists, displayAsDropdown } = req.body;
    
    // Support both old array format and new structured format
    if (Array.isArray(mailingLists)) {
      // Old format - convert to new structure
      const settings = getSettings();
      settings.mailingLists = {
        mandatory: [],
        optional: mailingLists,
        roleBased: []
      };
      
      if (displayAsDropdown !== undefined) {
        settings.mailingListDisplayAsDropdown = displayAsDropdown;
      }
      
      saveSettings(settings);
    } else if (mailingLists && typeof mailingLists === 'object') {
      // New structured format
      const { mandatory, optional, roleBased } = mailingLists;
      
      if (!Array.isArray(mandatory) || !Array.isArray(optional) || !Array.isArray(roleBased)) {
        return res.status(400).json({ error: 'Invalid format. Expected structured mailing lists with mandatory, optional, and roleBased arrays.' });
      }
      
      const settings = getSettings();
      settings.mailingLists = { mandatory, optional, roleBased };
      
      if (displayAsDropdown !== undefined) {
        settings.mailingListDisplayAsDropdown = displayAsDropdown;
      }
      
      saveSettings(settings);
    } else {
      return res.status(400).json({ error: 'Invalid format. Expected mailing lists data.' });
    }
    
    res.json({ success: true, message: 'Mailing lists updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update mailing lists', message: err.message });
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
router.get('/whatsapp', (req, res) => {
  try {
    // Read the settings file
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Return WhatsApp settings or default values
    const whatsappSettings = settings.whatsappSettings || {
      apiUrl: '',
      defaultMessage: `Welcome aboard to PT. Merdeka Tsingshan Indonesia. 
By this message, we inform you regarding your account information for the email address: {{email}}
Name: {{name}}
Title: {{title}}
Department: {{department}}
Email: {{email}}
Password: {{password}}

Please don't hesitate to contact IT for any question.`,
      defaultRecipient: 'userNumber'
    };
    
    res.json(whatsappSettings);
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
  }
});

router.put('/whatsapp', (req, res) => {
  try {
    const { apiUrl, defaultMessage, defaultRecipient } = req.body;
    
    // Read current settings
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Update WhatsApp settings
    settings.whatsappSettings = {
      apiUrl,
      defaultMessage,
      defaultRecipient: defaultRecipient || 'userNumber'
    };
    
    // Write updated settings back to file
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    
    res.json(settings.whatsappSettings);
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
    const settings = await getSettings();
    const microsoftGraphSettings = settings.microsoftGraphSettings || {
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
    
    res.json(microsoftGraphSettings);
  } catch (error) {
    console.error('Error getting Microsoft Graph settings:', error);
    res.status(500).json({ error: 'Failed to get Microsoft Graph settings' });
  }
});

router.put('/microsoft-graph', async (req, res) => {
  try {
    const settings = await getSettings();
    settings.microsoftGraphSettings = req.body;
    await saveSettings(settings);
    
    res.json(req.body);
  } catch (error) {
    console.error('Error updating Microsoft Graph settings:', error);
    res.status(500).json({ error: 'Failed to update Microsoft Graph settings' });
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
      const currentSettings = getSettings();
      currentSettings.microsoftGraphSettings = {
        ...currentSettings.microsoftGraphSettings,
        lastConnectionTest: new Date().toISOString()
      };
      saveSettings(currentSettings);
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
    const { recipients, ccRecipients, bccRecipients, hires, attachments } = req.body;
    const settings = await getSettings();
    const graphSettings = settings.microsoftGraphSettings;

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

    // Generate email content from template using HTML table format (same as preview)
    const hireCount = hires.length;
    const hireDate = new Date().toLocaleDateString();
    
    // Format hire details as HTML table (identical to preview logic)
    const hireDetailsHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">No.</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Name</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Position</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Department</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Email</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">License Type</th>
          </tr>
        </thead>
        <tbody>
          ${hires.map((hire, index) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.title}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.department}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.email}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.microsoft_365_license}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Replace template variables
    const subject = (graphSettings.emailSubjectTemplate || 'License Request for {{hireCount}} New Employees')
      .replace(/\{\{hireCount\}\}/g, hireCount.toString())
      .replace(/\{\{hireDate\}\}/g, hireDate);

    const body = (graphSettings.emailBodyTemplate || 'License request for new employees:\n\n{{hireDetails}}')
      .replace(/\{\{hireDetails\}\}/g, hireDetailsHtml)
      .replace(/\{\{hireCount\}\}/g, hireCount.toString())
      .replace(/\{\{hireDate\}\}/g, hireDate)
      .replace(/\n\n+/g, '<br><br>') // Convert multiple newlines to double <br>
      .replace(/\n/g, '<br>'); // Convert single newlines to <br>

    // Determine sender email
    let senderEmail = graphSettings.senderEmail;
    if (graphSettings.useLoggedInUserAsSender) {
      // TODO: Get logged-in user's email from session/token
      // For now, fall back to settings sender email
      senderEmail = graphSettings.senderEmail;
    }

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
      attachments: attachments
    };

    console.log('Sending license request email with Microsoft Graph...');
    const result = await microsoftGraphService.sendEmail(graphSettings, emailData);
    
    if (result.success) {
      const totalRecipients = finalToRecipients.length + finalCcRecipients.length + finalBccRecipients.length;
      res.json({
        success: true,
        message: `License request email sent successfully to ${totalRecipients} recipient(s)`,
        sentCount: hires.length,
        recipients: {
          to: finalToRecipients,
          cc: finalCcRecipients,
          bcc: finalBccRecipients
        }
      });
    } else {
      res.json({
        success: false,
        message: result.message || 'Failed to send license request email'
      });
    }
  } catch (error) {
    console.error('Error sending license request email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send license request email: ' + error.message
    });
  }
});

router.post('/microsoft-graph/email-template-preview', async (req, res) => {
  try {
    const { hires } = req.body;
    const settings = await getSettings();
    const graphSettings = settings.microsoftGraphSettings;

    // Format hire details as HTML table
    const hireDetailsHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">No.</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Name</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Position</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Department</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Email</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">License Type</th>
          </tr>
        </thead>
        <tbody>
          ${hires.map((hire, index) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.title}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.department}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.email}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${hire.microsoft_365_license}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

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

    const body = (graphSettings?.emailBodyTemplate || 'License request for new employees:\n\n{{hireDetails}}')
      .replace('{{hireDetails}}', hireDetailsHtml)
      .replace('{{hireCount}}', hires.length.toString())
      .replace('{{hireDate}}', currentDate)
      .replace(/\n\n+/g, '<br><br>') // Convert multiple newlines to double <br>
      .replace(/\n/g, '<br>'); // Convert single newlines to <br>

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

export default router;
