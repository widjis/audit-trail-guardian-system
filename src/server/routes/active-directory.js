
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

// Real LDAP/AD Connection using ldapjs
const createLdapClient = (settings) => {
  const client = ldap.createClient({
    url: `ldap://${settings.server}`,
    timeout: 5000,
    connectTimeout: 10000
  });
  
  return client;
};

const testLdapConnection = (settings) => {
  return new Promise((resolve, reject) => {
    try {
      if (!settings.server || !settings.username || !settings.password) {
        return reject(new Error("Missing required connection parameters"));
      }

      const client = createLdapClient(settings);
      
      client.on('error', (err) => {
        logger.api.error('LDAP connection error:', err);
        reject(new Error(`Connection failed: ${err.message}`));
      });
      
      // Bind with the provided credentials
      client.bind(settings.username, settings.password, (err) => {
        if (err) {
          logger.api.error('LDAP bind error:', err);
          client.destroy();
          return reject(new Error(`Authentication failed: ${err.message}`));
        }
        
        logger.api.info('LDAP connection successful');
        client.unbind();
        resolve({ success: true, message: "Connected successfully" });
      });
    } catch (err) {
      logger.api.error('LDAP connection setup error:', err);
      reject(new Error(`Connection setup failed: ${err.message}`));
    }
  });
};

const createLdapUser = (settings, userData) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate required parameters
      if (!userData.username || !userData.password || !userData.displayName) {
        return reject(new Error("Missing required user parameters"));
      }
      
      const client = createLdapClient(settings);
      
      client.on('error', (err) => {
        logger.api.error('LDAP connection error:', err);
        reject(new Error(`Connection failed: ${err.message}`));
      });
      
      // Bind with admin credentials
      client.bind(settings.username, settings.password, (err) => {
        if (err) {
          logger.api.error('LDAP bind error:', err);
          client.destroy();
          return reject(new Error(`Authentication failed: ${err.message}`));
        }
        
        // Create user DN (distinguished name)
        const userDN = `CN=${userData.displayName},${userData.ou}`;
        
        // Prepare user attributes
        const userEntry = {
          cn: userData.displayName,
          sAMAccountName: userData.username,
          objectClass: ['top', 'person', 'organizationalPerson', 'user'],
          givenName: userData.firstName,
          sn: userData.lastName,
          displayName: userData.displayName,
          userPrincipalName: `${userData.username}@${settings.domain}`,
          mail: userData.email,
          title: userData.title,
          department: userData.department,
          company: userData.company,
          physicalDeliveryOfficeName: userData.office,
          unicodePwd: encodeUnicodePwd(userData.password)
        };
        
        // Add the user
        client.add(userDN, userEntry, (err) => {
          if (err) {
            logger.api.error('LDAP add user error:', err);
            client.unbind();
            return reject(new Error(`Failed to create user: ${err.message}`));
          }
          
          // User created, now add to groups
          const groups = [userData.acl, 'VPN-USERS'];
          const addedGroups = [];
          let groupsProcessed = 0;
          
          groups.forEach(groupName => {
            // Find the group first
            const groupFilter = `(&(objectClass=group)(cn=${groupName}))`;
            client.search(settings.baseDN, { 
              scope: 'sub',
              filter: groupFilter
            }, (err, res) => {
              if (err) {
                logger.api.warn(`LDAP search for group ${groupName} error:`, err);
                groupsProcessed++;
                checkComplete();
                return;
              }
              
              let groupFound = false;
              
              res.on('searchEntry', (entry) => {
                groupFound = true;
                const groupDN = entry.objectName;
                
                // Modify group to add the new user
                const change = new ldap.Change({
                  operation: 'add',
                  modification: {
                    member: userDN
                  }
                });
                
                client.modify(groupDN, change, (modErr) => {
                  if (modErr) {
                    logger.api.warn(`Failed to add user to group ${groupName}:`, modErr);
                  } else {
                    addedGroups.push(groupName);
                    logger.api.info(`User added to group ${groupName}`);
                  }
                  
                  groupsProcessed++;
                  checkComplete();
                });
              });
              
              res.on('error', (err) => {
                logger.api.warn(`Group search error for ${groupName}:`, err);
                groupsProcessed++;
                checkComplete();
              });
              
              res.on('end', () => {
                if (!groupFound) {
                  logger.api.warn(`Group ${groupName} not found`);
                  groupsProcessed++;
                  checkComplete();
                }
              });
            });
          });
          
          function checkComplete() {
            if (groupsProcessed === groups.length) {
              client.unbind();
              resolve({
                success: true,
                message: `User ${userData.username} created successfully`,
                details: {
                  samAccountName: userData.username,
                  displayName: userData.displayName,
                  distinguishedName: userDN,
                  groups: addedGroups
                }
              });
            }
          }
        });
      });
    } catch (err) {
      logger.api.error('LDAP user creation setup error:', err);
      reject(new Error(`User creation setup failed: ${err.message}`));
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
      enabled: false
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
    
    // Test connection using ldapjs
    await testLdapConnection(settings);
    
    res.json({ success: true, message: "Connection successful" });
  } catch (err) {
    logger.api.warn('AD connection test failed:', err);
    res.status(400).json({ success: false, error: `Connection failed: ${err.message}` });
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
