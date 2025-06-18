import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';
import sql from 'mssql';

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

// Add Microsoft Graph settings routes
router.get('/microsoft-graph', (req, res) => {
  try {
    const settings = getSettings();
    const graphSettings = settings.microsoftGraphSettings || {
      enabled: false,
      clientId: '',
      clientSecret: '',
      tenantId: '',
      authority: '',
      scope: ["https://graph.microsoft.com/.default"]
    };
    
    res.json(graphSettings);
  } catch (error) {
    console.error('Error fetching Microsoft Graph settings:', error);
    res.status(500).json({ error: 'Failed to fetch Microsoft Graph settings' });
  }
});

router.put('/microsoft-graph', (req, res) => {
  try {
    const { enabled, clientId, clientSecret, tenantId, authority, scope, lastConnectionTest } = req.body;
    
    const settings = getSettings();
    settings.microsoftGraphSettings = {
      enabled: enabled || false,
      clientId: clientId || '',
      clientSecret: clientSecret || '',
      tenantId: tenantId || '',
      authority: authority || '',
      scope: scope || ["https://graph.microsoft.com/.default"],
      lastConnectionTest
    };
    
    saveSettings(settings);
    
    res.json(settings.microsoftGraphSettings);
  } catch (error) {
    console.error('Error updating Microsoft Graph settings:', error);
    res.status(500).json({ error: 'Failed to update Microsoft Graph settings' });
  }
});

// Test Microsoft Graph connection
router.post('/microsoft-graph/test-connection', async (req, res) => {
  const { clientId, clientSecret, tenantId, authority, scope } = req.body;
  
  try {
    // Validate required fields
    if (!clientId || !clientSecret || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: clientId, clientSecret, and tenantId are required' 
      });
    }

    // Create the authority URL if not provided
    const authUrl = authority || `https://login.microsoftonline.com/${tenantId}`;
    const tokenEndpoint = `${authUrl}/oauth2/v2.0/token`;
    
    // Prepare the token request
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: (scope || ["https://graph.microsoft.com/.default"]).join(' '),
      grant_type: 'client_credentials'
    });

    console.log('Testing Microsoft Graph connection...');
    console.log('Token endpoint:', tokenEndpoint);
    console.log('Client ID:', clientId);
    console.log('Scope:', scope);

    // Make the token request using fetch (built-in in Node.js 18+)
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', errorText);
      return res.status(400).json({ 
        success: false, 
        message: `Authentication failed: ${tokenResponse.status} ${tokenResponse.statusText}` 
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token acquired successfully');

    // Test a simple Graph API call to verify the token works
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (graphResponse.ok || graphResponse.status === 404) {
      // 404 is expected for app-only auth when calling /me
      // What matters is that we got a valid response (not 401)
      res.json({ 
        success: true, 
        message: `Successfully connected to Microsoft Graph API for tenant ${tenantId}`
      });
    } else {
      const errorText = await graphResponse.text();
      console.error('Graph API test failed:', errorText);
      res.status(400).json({ 
        success: false, 
        message: `Graph API test failed: ${graphResponse.status} ${graphResponse.statusText}` 
      });
    }
  } catch (error) {
    console.error('Microsoft Graph connection test failed:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Failed to connect to Microsoft Graph API', 
      error: error.message 
    });
  }
});

// Send license request email via Microsoft Graph
router.post('/microsoft-graph/send-license-request', async (req, res) => {
  try {
    const { recipient, hires } = req.body;
    
    if (!recipient || !hires || !Array.isArray(hires)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient and hires array are required' 
      });
    }

    // Get Microsoft Graph settings
    const settings = getSettings();
    const graphSettings = settings.microsoftGraphSettings;
    
    if (!graphSettings || !graphSettings.enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'Microsoft Graph is not configured or enabled' 
      });
    }

    // Get access token
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${graphSettings.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: graphSettings.clientId,
        client_secret: graphSettings.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token request failed:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to authenticate with Microsoft Graph' 
      });
    }

    const { access_token } = await tokenResponse.json();

    // Create email content
    const subject = `License Request for ${hires.length} New Hire${hires.length > 1 ? 's' : ''}`;
    
    let emailBody = `Dear License Administrator,\n\n`;
    emailBody += `Please process the following Microsoft 365 license requests for new employees:\n\n`;
    
    hires.forEach((hire, index) => {
      emailBody += `${index + 1}. ${hire.name}\n`;
      emailBody += `   Department: ${hire.department}\n`;
      emailBody += `   Job Title: ${hire.title}\n`;
      emailBody += `   Email: ${hire.email}\n`;
      emailBody += `   Requested License: ${hire.microsoft_365_license}\n\n`;
    });
    
    emailBody += `Please assign the appropriate licenses and confirm once completed.\n\n`;
    emailBody += `Best regards,\n`;
    emailBody += `IT Administration System`;

    // Send email via Microsoft Graph
    const emailMessage = {
      message: {
        subject: subject,
        body: {
          contentType: 'Text',
          content: emailBody
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipient
            }
          }
        ]
      }
    };

    const sendResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailMessage)
    });

    if (!sendResponse.ok) {
      const error = await sendResponse.text();
      console.error('Email send failed:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send email via Microsoft Graph' 
      });
    }

    res.json({ 
      success: true, 
      message: `License request email sent successfully to ${recipient}`,
      sentCount: 1
    });

  } catch (error) {
    console.error('Error sending license request email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while sending email' 
    });
  }
});

// Test email send functionality
router.post('/microsoft-graph/test-email', async (req, res) => {
  try {
    const { recipient } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email is required' 
      });
    }

    // Get Microsoft Graph settings
    const settings = getSettings();
    const graphSettings = settings.microsoftGraphSettings;
    
    if (!graphSettings || !graphSettings.enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'Microsoft Graph is not configured or enabled' 
      });
    }

    // Get access token
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${graphSettings.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: graphSettings.clientId,
        client_secret: graphSettings.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to authenticate with Microsoft Graph' 
      });
    }

    const { access_token } = await tokenResponse.json();

    // Send test email
    const testMessage = {
      message: {
        subject: 'Test Email from IT Administration System',
        body: {
          contentType: 'Text',
          content: 'This is a test email to verify Microsoft Graph email functionality is working correctly.\n\nBest regards,\nIT Administration System'
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipient
            }
          }
        ]
      }
    };

    const sendResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });

    if (!sendResponse.ok) {
      const error = await sendResponse.text();
      console.error('Test email send failed:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email' 
      });
    }

    res.json({ 
      success: true, 
      message: `Test email sent successfully to ${recipient}` 
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while sending test email' 
    });
  }
});

// Get email template preview
router.post('/microsoft-graph/email-template-preview', async (req, res) => {
  try {
    const { hires } = req.body;
    
    if (!hires || !Array.isArray(hires)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hires array is required' 
      });
    }

    // Generate email template
    const subject = `License Request for ${hires.length} New Hire${hires.length > 1 ? 's' : ''}`;
    
    let emailBody = `Dear License Administrator,\n\n`;
    emailBody += `Please process the following Microsoft 365 license requests for new employees:\n\n`;
    
    hires.forEach((hire, index) => {
      emailBody += `${index + 1}. ${hire.name}\n`;
      emailBody += `   Department: ${hire.department}\n`;
      emailBody += `   Job Title: ${hire.title}\n`;
      emailBody += `   Email: ${hire.email}\n`;
      emailBody += `   Requested License: ${hire.microsoft_365_license}\n\n`;
    });
    
    emailBody += `Please assign the appropriate licenses and confirm once completed.\n\n`;
    emailBody += `Best regards,\n`;
    emailBody += `IT Administration System`;

    res.json({ 
      subject: subject,
      body: emailBody
    });

  } catch (error) {
    console.error('Error generating email template preview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while generating email template' 
    });
  }
});

export default router;
