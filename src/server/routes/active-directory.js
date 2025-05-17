import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import ldap from 'ldapjs';
import { executeQuery } from '../utils/dbConnection.js';
import logger from '../utils/logger.js';

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
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return settings;
    }
    return {};
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

// Format the user's bind DN based on authentication format preference
const formatBindCredential = (settings, username) => {
  // Debug the incoming username format
  logger.api.debug(`Formatting username: ${username} using format: ${settings.authFormat}`);
  
  // If username already looks like a DN, use it as is
  if (username.startsWith('CN=') || username.startsWith('cn=')) {
    logger.api.debug('Username already in DN format, using as is');
    return username;
  }
  
  // If authFormat is explicitly set to DN, format as DN
  if (settings.authFormat === 'dn') {
    // Extract the username part if it's in UPN format (user@domain.com)
    const userPart = username.includes('@') ? username.split('@')[0] : username;
    
    // Create a simple DN - customize based on your AD structure
    const formattedDN = `CN=${userPart},${settings.baseDN}`;
    logger.api.debug(`Formatted DN: ${formattedDN}`);
    return formattedDN;
  }
  
  // Default to UPN format (or keep as is if it already has @domain)
  if (!username.includes('@')) {
    const upn = `${username}@${settings.domain}`;
    logger.api.debug(`Formatted UPN: ${upn}`);
    return upn;
  }
  
  logger.api.debug(`Username appears to be already in UPN format: ${username}`);
  return username;
};

// Real LDAP/AD Connection using ldapjs
const createLdapClient = (settings) => {
  // Determine the protocol (ldap or ldaps)
  const protocol = settings.protocol || 'ldap';
  const port = protocol === 'ldaps' ? 636 : 389;
  
  logger.api.debug(`Creating LDAP client with URL: ${protocol}://${settings.server}:${port}`);
  
  // Enhanced TLS options for LDAPS
  const tlsOptions = protocol === 'ldaps' ? {
    rejectUnauthorized: false, // Set to true in production with proper certificates
    requestCert: true,
    // Enable this if you need to provide client certificates
    // key: fs.readFileSync('client-key.pem'),
    // cert: fs.readFileSync('client-cert.pem')
  } : undefined;
  
  // Create client with appropriate URL
  const client = ldap.createClient({
    url: `${protocol}://${settings.server}:${port}`,
    timeout: 5000,
    connectTimeout: 10000,
    tlsOptions: tlsOptions,
    reconnect: false // Disable automatic reconnection to avoid hanging
  });
  
  // Add more detailed event handlers
  client.on('connectError', (err) => {
    logger.api.error('LDAP connection error event:', err.message);
  });
  
  client.on('error', (err) => {
    logger.api.error('LDAP client error event:', err.message);
  });
  
  client.on('connect', () => {
    logger.api.debug('LDAP client connected successfully');
  });
  
  return client;
};

const testLdapConnection = (settings) => {
  return new Promise((resolve, reject) => {
    try {
      if (!settings.server || !settings.username || !settings.password) {
        return reject(new Error("Missing required connection parameters"));
      }

      logger.api.debug(`Testing LDAP connection to server: ${settings.server} with protocol: ${settings.protocol}`);
      logger.api.debug(`Using authentication format: ${settings.authFormat}`);
      
      const client = createLdapClient(settings);
      
      client.on('error', (err) => {
        logger.api.error('LDAP connection error:', err);
        client.destroy();
        reject(new Error(`Connection failed: ${err.message}`));
      });
      
      // Format the bind credentials based on settings
      const bindDN = formatBindCredential(settings, settings.username);
      logger.api.debug(`Attempting LDAP bind with DN: ${bindDN}`);
      
      // Bind with the provided credentials
      client.bind(bindDN, settings.password, (err) => {
        if (err) {
          logger.api.error(`LDAP bind error (using ${settings.authFormat || 'default'} format):`, err);
          logger.api.debug(`Error code: ${err.code}, Error name: ${err.name}`);
          
          let errorDetails = '';
          if (err.code === 49) {
            if (err.name === 'InvalidCredentialsError') {
              errorDetails = ' - Username or password is incorrect';
            } else if (err.name === 'AcceptSecurityContextError') {
              errorDetails = ' - Account restrictions are preventing login';
            }
          } else if (err.code === 53) {
            errorDetails = ' - The server cannot be located';
          } else if (err.code === 52) {
            errorDetails = ' - Invalid username format';
          }
          
          client.destroy();
          return reject(new Error(`Authentication failed${errorDetails}: ${err.message}`));
        }
        
        const protocol = settings.protocol || 'ldap';
        const authFormat = settings.authFormat || 'default';
        const secureMsg = protocol === 'ldaps' ? ' using secure LDAPS connection' : '';
        logger.api.info(`LDAP connection successful${secureMsg} with ${authFormat} auth format`);
        client.unbind();
        resolve({ success: true, message: `Connected successfully${secureMsg} using ${authFormat} auth format` });
      });
    } catch (err) {
      logger.api.error('LDAP connection setup error:', err);
      reject(new Error(`Connection setup failed: ${err.message}`));
    }
  });
};

// Helper function to encode password for AD (requires specific unicode format)
function encodeUnicodePwd(password) {
  const encodedPwd = Buffer.from('"' + password + '"', 'utf16le');
  return encodedPwd;
}

// Get AD settings
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    const adSettings = settings.activeDirectorySettings || {
      server: '',
      username: '',
      password: '',
      domain: 'mbma.com',
      baseDN: 'DC=mbma,DC=com',
      protocol: 'ldap',
      enabled: false,
      authFormat: 'upn' // Default to UPN format
    };
    
    // Don't send the password back to the client
    const safeSettings = { ...adSettings };
    if (safeSettings.password) {
      safeSettings.password = '••••••••';
    }
    
    res.json(safeSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Active Directory settings', message: err.message });
  }
});

// Update AD settings
router.put('/', (req, res) => {
  try {
    const adSettings = req.body;
    const settings = getSettings();
    
    // If there's already a password saved and the incoming password is masked,
    // keep the original password
    if (settings.activeDirectorySettings && adSettings.password === '••••••••') {
      adSettings.password = settings.activeDirectorySettings.password;
    }
    
    settings.activeDirectorySettings = adSettings;
    saveSettings(settings);
    
    // Don't send the password back to the client
    const safeSettings = { ...adSettings };
    if (safeSettings.password) {
      safeSettings.password = '••••••••';
    }
    
    res.json(safeSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Active Directory settings', message: err.message });
  }
});

// Test AD connection
router.post('/test', async (req, res) => {
  try {
    const settings = req.body;
    logger.api.debug('Testing AD connection with settings:', JSON.stringify({
      server: settings.server,
      username: settings.username,
      domain: settings.domain,
      protocol: settings.protocol,
      baseDN: settings.baseDN,
      authFormat: settings.authFormat
    }));
    
    // Test connection using ldapjs
    const result = await testLdapConnection(settings);
    
    res.json(result);
  } catch (err) {
    logger.api.warn('AD connection test failed:', err);
    res.status(400).json({ success: false, error: `${err.message}` });
  }
});

// Create AD user
router.post('/create-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    // First, check if AD integration is enabled
    const settings = getSettings();
    if (!settings.activeDirectorySettings || !settings.activeDirectorySettings.enabled) {
      return res.status(400).json({ 
        success: false, 
        error: "Active Directory integration is not enabled" 
      });
    }
    
    // Create user in AD using ldapjs
    const result = await createLdapUser(settings.activeDirectorySettings, userData);
    
    // If successful, update the hire record to mark the account as created
    if (result.success) {
      try {
        await executeQuery('UPDATE hires SET account_status = ? WHERE id = ?', ['Active', id]);
        
        // Add an audit log entry for the AD account creation
        const timestamp = new Date().toISOString();
        const audit = {
          id: Math.random().toString(36).slice(2),
          hire_id: id,
          action: 'AD_ACCOUNT_CREATED',
          details: JSON.stringify({
            username: userData.username,
            displayName: userData.displayName,
            ou: userData.ou
          }),
          created_by: req.user?.username || 'system',
          created_at: timestamp
        };
        
        // Insert the audit log into the database
        await executeQuery(
          'INSERT INTO audit_logs (id, hire_id, action, details, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [audit.id, audit.hire_id, audit.action, audit.details, audit.created_by, audit.created_at]
        );
      } catch (dbError) {
        // Using the correct logger format for the server
        logger.db.error('Database error after AD account creation:', dbError);
        // Still return success, but with a warning
        return res.json({
          ...result,
          warning: "AD account created but database update failed"
        });
      }
    }
    
    res.json(result);
  } catch (err) {
    // Using the correct logger format for the server
    logger.api.error('Error creating AD user:', err);
    res.status(500).json({ 
      success: false, 
      error: `Failed to create AD user: ${err.message}` 
    });
  }
});

export default router;
