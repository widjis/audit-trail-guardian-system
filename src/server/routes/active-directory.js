
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
    // Using format CN=username,CN=Users,DC=domain,DC=com which is more standard
    const formattedDN = `CN=${userPart},CN=Users,${settings.baseDN}`;
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
  
  // Enhanced TLS options for LDAPS - more permissive for troubleshooting
  const tlsOptions = {
    rejectUnauthorized: false, // Don't validate certificate in dev/test environments
    requestCert: true,
    ciphers: 'ALL',
    secureProtocol: 'TLSv1_2_method' // Force TLSv1.2
  };
  
  // Create client with appropriate URL and explicitly set protocol version to v3
  const client = ldap.createClient({
    url: `${protocol}://${settings.server}:${port}`,
    timeout: 10000, // Increased timeout
    connectTimeout: 15000, // Increased connect timeout
    tlsOptions: tlsOptions,
    reconnect: false, // Disable automatic reconnection to avoid hanging
    idleTimeout: 30000,
    strictDN: false, // More forgiving DN parsing
    queueSize: 1000,
    queueTimeout: 5000,
    queueDisable: false,
    version: 3 // Explicitly set LDAP protocol version to 3
  });
  
  // Add more detailed event handlers
  client.on('connectError', (err) => {
    logger.api.error('LDAP connection error event:', err.message);
  });
  
  client.on('error', (err) => {
    logger.api.error('LDAP client error event:', err.message);
    if (err.code) {
      logger.api.error(`LDAP error code: ${err.code}, name: ${err.name}`);
    }
  });
  
  client.on('connect', () => {
    logger.api.debug('LDAP client connected successfully');
  });
  
  client.on('timeout', () => {
    logger.api.warn('LDAP client timeout occurred');
  });
  
  client.on('close', () => {
    logger.api.info('LDAP connection closed');
  });
  
  return client;
};

const testLdapConnection = (settings) => {
  return new Promise((resolve, reject) => {
    try {
      if (!settings.server || !settings.username) {
        return reject(new Error("Missing required connection parameters"));
      }
      
      if (!settings.password) {
        return reject(new Error("Password is required for authentication"));
      }

      // Log connection attempt without password
      logger.api.debug(`Testing LDAP connection to server: ${settings.server} with protocol: ${settings.protocol}`);
      logger.api.debug(`Using authentication format: ${settings.authFormat}`);
      
      const client = createLdapClient(settings);
      
      // Setup error handling
      client.on('error', (err) => {
        logger.api.error('LDAP connection error:', err);
        client.destroy();
        reject(new Error(`Connection failed: ${err.message}`));
      });
      
      // Format the bind credentials based on settings
      const bindDN = formatBindCredential(settings, settings.username);
      logger.api.debug(`Attempting LDAP bind with DN: ${bindDN}`);
      logger.api.debug(`Password length: ${settings.password ? settings.password.length : 0} characters`);
      
      // Bind with the provided credentials, following example code structure
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

// FIXED: Improved password encoding for AD (requires specific unicode format)
// Properly encodes password with double quotes and uses utf16le encoding
function encodeUnicodePwd(password) {
  if (!password) {
    throw new Error("Password is required for AD account creation");
  }
  
  // Validate password meets minimum complexity requirements
  if (password.length < 7) {
    throw new Error("Password must be at least 7 characters long for Active Directory");
  }

  // Check for potentially problematic characters in the password
  const problematicChars = /[^\x20-\x7E]/; // Non-printable ASCII
  if (problematicChars.test(password)) {
    logger.api.warn("Password contains potentially problematic non-ASCII characters");
  }
  
  logger.api.debug(`Encoding password of length: ${password.length}`);
  
  // Properly encode password with quotes for AD according to MS specs
  try {
    // The proper format for AD password is to wrap with double quotes and use utf16le
    const encodedPwd = Buffer.from('"' + password + '"', 'utf16le');
    logger.api.debug(`Password encoded successfully, buffer length: ${encodedPwd.length} bytes`);
    return encodedPwd;
  } catch (error) {
    logger.api.error("Error encoding password:", error);
    throw new Error(`Failed to encode password: ${error.message}`);
  }
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
      authFormat: 'dn' // Default to DN format as per example
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
    const receivedSettings = req.body;
    logger.api.debug('Testing AD connection with settings:', JSON.stringify({
      server: receivedSettings.server,
      username: receivedSettings.username,
      domain: receivedSettings.domain,
      protocol: receivedSettings.protocol,
      baseDN: receivedSettings.baseDN,
      authFormat: receivedSettings.authFormat
    }));
    
    // Handle masked password case - get the actual password from stored settings if needed
    let finalSettings = { ...receivedSettings };
    
    // If password is masked and we need to use stored password
    if (finalSettings.password === '••••••••') {
      const storedSettings = getSettings();
      if (storedSettings.activeDirectorySettings && storedSettings.activeDirectorySettings.password) {
        logger.api.debug('Using stored password for connection test');
        finalSettings.password = storedSettings.activeDirectorySettings.password;
      } else {
        return res.status(400).json({ 
          success: false, 
          error: "Cannot use masked password. Please provide the actual password." 
        });
      }
    }
    
    // Test connection using ldapjs
    const result = await testLdapConnection(finalSettings);
    
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
    
    // Log received data (without logging the actual password)
    logger.api.debug(`Create user request for hire ID: ${id}`);
    logger.api.debug(`Username: ${userData.username}, Display name: ${userData.displayName}`);
    logger.api.debug(`Password provided: ${userData.password ? 'Yes' : 'No'}, Length: ${userData.password?.length || 0}`);
    
    // First, check if AD integration is enabled
    const settings = getSettings();
    if (!settings.activeDirectorySettings || !settings.activeDirectorySettings.enabled) {
      return res.status(400).json({ 
        success: false, 
        error: "Active Directory integration is not enabled" 
      });
    }
    
    // Enhanced password validation
    if (!userData.password) {
      logger.api.error('Missing password for AD user creation');
      return res.status(400).json({
        success: false,
        error: "Missing password for user account creation"
      });
    }
    
    // Check password complexity
    if (userData.password.length < 7) {
      logger.api.error('Password too short for AD user creation');
      return res.status(400).json({
        success: false,
        error: "Password must be at least 7 characters long for AD account"
      });
    }
    
    // Create user in AD using ldapjs
    const result = await createLdapUser(settings.activeDirectorySettings, userData);
    
    // If successful, update the hire record to mark the account as created
    if (result.success) {
      try {
        // FIXED: Changed "account_status" to "account_creation_status" to match database schema
        await executeQuery('UPDATE hires SET account_creation_status = ? WHERE id = ?', ['Active', id]);
        logger.db.info(`Updated account_creation_status to 'Active' for hire ID ${id}`);
        
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
        try {
          await executeQuery(
            'INSERT INTO audit_logs (id, hire_id, action, details, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [audit.id, audit.hire_id, audit.action, audit.details, audit.created_by, audit.created_at]
          );
          logger.db.info(`Created audit log entry for AD account creation for hire ID ${id}`);
        } catch (auditError) {
          // Log the specific SQL error details for audit log insertion
          logger.db.error(`Audit log creation error for hire ID ${id}:`, auditError);
          if (auditError.originalError?.info) {
            logger.db.error('SQL error details:', auditError.originalError.info);
          }
          // Continue execution even if audit log fails - we still want to return success
          logger.db.warn('AD account created but audit log creation failed');
        }
      } catch (dbError) {
        // Log detailed information about the database error
        logger.db.error('Database error when updating account_creation_status:', dbError);
        if (dbError.originalError?.info) {
          logger.db.error('SQL error details:', dbError.originalError.info);
          logger.db.error(`SQL error number: ${dbError.originalError.info.number}, state: ${dbError.originalError.info.state}`);
          logger.db.error(`SQL error message: ${dbError.originalError.info.message}`);
        }
        
        // Still return success, but with a warning
        return res.json({
          ...result,
          warning: "AD account created but database update failed. Please check database schema."
        });
      }
    }
    
    res.json(result);
  } catch (err) {
    // Using the correct logger format for the server with enhanced error details
    logger.api.error('Error creating AD user:', err);
    if (err.originalError?.info) {
      logger.api.error('SQL error details:', err.originalError.info);
    }
    res.status(500).json({ 
      success: false, 
      error: `Failed to create AD user: ${err.message}` 
    });
  }
});

// Create user in AD - enhanced with better error handling and logging
const createLdapUser = async (settings, userData) => {
  return new Promise(async (resolve, reject) => {
    const client = createLdapClient(settings);
    
    try {
      // Verify we have a password
      if (!userData.password) {
        throw new Error("Missing password for user account");
      }
      
      // Format the bind credentials based on settings
      const bindDN = formatBindCredential(settings, settings.username);
      logger.api.debug(`Binding to AD with DN: ${bindDN}`);
      
      // Bind with service account
      await new Promise((resolveBind, rejectBind) => {
        client.bind(bindDN, settings.password, (err) => {
          if (err) {
            logger.api.error('Error binding to AD:', err);
            return rejectBind(err);
          }
          resolveBind();
        });
      });
      
      logger.api.debug('Successfully bound to AD, creating user');
      
      // Create user DN
      const userDN = `CN=${userData.displayName},${userData.ou}`;
      logger.api.debug(`User DN will be: ${userDN}`);
      
      // Encode password for AD - with enhanced error handling
      let unicodePwd;
      try {
        unicodePwd = encodeUnicodePwd(userData.password);
        logger.api.debug(`Successfully encoded password for user ${userData.username}`);
      } catch (pwdError) {
        logger.api.error('Failed to encode password:', pwdError);
        throw new Error(`Password encoding failed: ${pwdError.message}`);
      }
      
      // Create user entry object with careful attribute typing
      const entry = {
        objectClass: ['top', 'person', 'organizationalPerson', 'user'],
        cn: userData.displayName,
        sn: userData.lastName || userData.displayName.split(' ').pop() || userData.displayName,
        givenName: userData.firstName || userData.displayName.split(' ')[0] || userData.displayName,
        displayName: userData.displayName,
        sAMAccountName: userData.username,
        userAccountControl: '512', // Enable account
      };
      
      // Only add non-empty attributes to avoid syntax errors
      if (userData.email && userData.email.includes('@')) {
        entry.mail = userData.email;
        entry.userPrincipalName = userData.email;
      }
      
      if (userData.title) entry.title = userData.title;
      if (userData.department) entry.department = userData.department;
      if (userData.company) entry.company = userData.company;
      if (userData.office) entry.physicalDeliveryOfficeName = userData.office;
      
      // Add password as a separate property to ensure correct typing
      entry.unicodePwd = unicodePwd;
      
      // Log the entry object for debugging (without the password)
      const debugEntry = { ...entry };
      delete debugEntry.unicodePwd;
      logger.api.debug('Creating user with attributes:', JSON.stringify(debugEntry));
      
      // Create the user with enhanced error logging
      await new Promise((resolveAdd, rejectAdd) => {
        client.add(userDN, entry, (err) => {
          if (err) {
            logger.api.error(`Error creating user: ${err.message}`);
            if (err.code) {
              logger.api.error(`LDAP add error code: ${err.code}, name: ${err.name}`);
            }
            // Enhanced logging for attribute syntax errors
            if (err.name === 'InvalidAttributeSyntaxError') {
              logger.api.error('Invalid attribute syntax. Check all attribute formats, especially:');
              logger.api.error('- unicodePwd (password encoding)');
              logger.api.error('- userPrincipalName and mail (must be valid email formats)');
              logger.api.error('- sAMAccountName (must be unique and <=20 characters)');
              
              // Log each attribute separately to help identify the problematic one
              logger.api.debug('Checking individual attributes for syntax issues:');
              for (const [key, value] of Object.entries(debugEntry)) {
                logger.api.debug(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
              }
            }
            return rejectAdd(err);
          }
          logger.api.info(`User ${userData.username} created successfully with DN: ${userDN}`);
          resolveAdd();
        });
      });
      
      // Add to security groups if specified - FIXED: pass settings to addUserToGroup
      if (userData.acl) {
        try {
          await addUserToGroup(client, userDN, userData.acl, settings);
          logger.api.debug(`Added user to ${userData.acl} group`);
        } catch (groupErr) {
          logger.api.warn(`Failed to add user to ${userData.acl} group:`, groupErr);
          // Continue even if group add fails
        }
      }
      
      // Always add to VPN-USERS group - FIXED: pass settings to addUserToGroup
      try {
        await addUserToGroup(client, userDN, 'VPN-USERS', settings);
        logger.api.debug(`Added user to VPN-USERS group`);
      } catch (vpnErr) {
        logger.api.warn(`Failed to add user to VPN-USERS group:`, vpnErr);
        // Continue even if group add fails
      }
      
      // Unbind when done
      await new Promise((resolveUnbind) => {
        client.unbind(() => {
          logger.api.debug('Successfully unbound from AD server');
          resolveUnbind();
        });
      });
      
      // Return success
      resolve({
        success: true,
        message: "Active Directory account created successfully",
        details: {
          samAccountName: userData.username,
          displayName: userData.displayName,
          distinguishedName: userDN,
          groups: [userData.acl, 'VPN-USERS'].filter(Boolean),
        }
      });
      
    } catch (err) {
      logger.api.error('Error in AD user creation process:', err);
      
      // Ensure client is unbound in case of error
      try {
        client.unbind();
      } catch (unbindErr) {
        logger.api.debug('Error unbinding client:', unbindErr);
      }
      
      // Return failure with details
      reject({
        success: false,
        error: `Failed to create AD user: ${err.message}`
      });
    }
  });
};

// FIXED: Helper function to add user to a group with improved error handling and proper baseDN usage
const addUserToGroup = (client, userDN, groupName, settings) => {
  return new Promise((resolve, reject) => {
    logger.api.debug(`Searching for group: ${groupName} in baseDN: ${settings.baseDN}`);
    
    // FIXED: Use proper baseDN from settings instead of empty string
    const searchBase = settings.baseDN;
    
    // First search for the group
    client.search(searchBase, {
      filter: `(&(objectClass=group)(cn=${groupName}))`,
      scope: 'sub'
    }, (err, res) => {
      if (err) {
        logger.api.error(`Error searching for group ${groupName} in ${searchBase}:`, err);
        return reject(err);
      }
      
      let groupDN = null;
      
      res.on('searchEntry', (entry) => {
        groupDN = entry.dn.toString();
        logger.api.debug(`Found group DN: ${groupDN}`);
      });
      
      res.on('error', (err) => {
        logger.api.error(`Search error for group ${groupName}:`, err);
        reject(err);
      });
      
      res.on('end', () => {
        if (!groupDN) {
          logger.api.warn(`Group ${groupName} not found in ${searchBase}`);
          return reject(new Error(`Group ${groupName} not found`));
        }
        
        // Modify group to add member
        const change = new ldap.Change({
          operation: 'add',
          modification: {
            type: 'member',
            values: [userDN]
          }
        });
        
        logger.api.debug(`Adding user ${userDN} to group ${groupDN}`);
        client.modify(groupDN, change, (err) => {
          if (err) {
            // If the error is that the user is already a member, that's ok
            if (err.name === 'EntryAlreadyExistsError') {
              logger.api.info(`User ${userDN} is already a member of ${groupName}`);
              return resolve();
            }
            logger.api.error(`Error adding user to group ${groupName}:`, err);
            return reject(err);
          }
          logger.api.info(`Successfully added user to group ${groupName}`);
          resolve();
        });
      });
    });
  });
};

// Add a new endpoint to search for users in AD
router.get('/search-users', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: "Search query must be at least 2 characters" 
      });
    }
    
    logger.api.debug(`Searching AD for users matching: ${query}`);
    
    // Get AD settings
    const settings = getSettings();
    if (!settings.activeDirectorySettings || !settings.activeDirectorySettings.enabled) {
      return res.status(400).json({ 
        success: false, 
        error: "Active Directory integration is not enabled" 
      });
    }
    
    // Search for users
    const users = await searchAdUsers(settings.activeDirectorySettings, query);
    
    res.json({
      success: true,
      users
    });
  } catch (err) {
    logger.api.error('Error searching AD users:', err);
    res.status(500).json({ 
      success: false, 
      error: `Failed to search AD users: ${err.message}` 
    });
  }
});

// Function to search for users in Active Directory
const searchAdUsers = async (settings, query) => {
  return new Promise((resolve, reject) => {
    const client = createLdapClient(settings);
    
    try {
      // Format the bind credentials based on settings
      const bindDN = formatBindCredential(settings, settings.username);
      logger.api.debug(`Binding to AD with DN: ${bindDN} for user search`);
      logger.api.debug(`Using baseDN: ${settings.baseDN}`);
      
      // Bind with service account
      client.bind(bindDN, settings.password, (err) => {
        if (err) {
          logger.api.error('Error binding to AD for user search:', err);
          client.destroy();
          return reject(err);
        }
        
        logger.api.debug('Successfully bound to AD, searching users');
        
        // Escape special characters in the query to prevent LDAP injection
        const safeQuery = escapeLdapFilterValue(query);
        
        // Create search filter - expanded to include more attributes and make case insensitive
        // Using more relaxed filter with multiple search attributes
        const searchFilter = `(&(objectClass=user)(objectCategory=person)(|(displayName=*${safeQuery}*)(sAMAccountName=*${safeQuery}*)(mail=*${safeQuery}*)(givenName=*${safeQuery}*)(sn=*${safeQuery}*)))`;
        
        // Specify which attributes to return
        const searchOptions = {
          filter: searchFilter,
          scope: 'sub',
          sizeLimit: 100, // Limit results but more generous
          attributes: ['displayName', 'sAMAccountName', 'mail', 'title', 'department', 'distinguishedName', 'givenName', 'sn']
        };
        
        logger.api.debug(`Searching with filter: ${searchFilter}`);
        logger.api.debug(`Search base: ${settings.baseDN}`);
        
        const users = [];
        
        // Perform the search with better error handling
        client.search(settings.baseDN, searchOptions, (err, res) => {
          if (err) {
            logger.api.error('Error searching AD:', err);
            client.destroy();
            return reject(err);
          }
          
          res.on('searchEntry', (entry) => {
            // Only process complete entries with object property
            if (entry && entry.object) {
              // Log the raw entry for debugging
              logger.api.debug(`Raw search entry: ${JSON.stringify(entry.object)}`);
              
              const user = {
                displayName: entry.object.displayName || entry.object.cn || '',
                username: entry.object.sAMAccountName || '',
                email: entry.object.mail || '',
                title: entry.object.title || '',
                department: entry.object.department || '',
                dn: entry.object.distinguishedName || ''
              };
              
              logger.api.debug(`Found user: ${user.displayName} (${user.username})`);
              users.push(user);
            } else {
              // For incomplete entries, log details to help troubleshoot
              logger.api.warn('Received incomplete search entry from AD:', entry);
              
              // Try to extract any useful information from the entry
              if (entry && entry.attributes) {
                try {
                  const extractedUser = {
                    displayName: '',
                    username: '',
                    email: '',
                    title: '',
                    department: '',
                    dn: ''
                  };
                  
                  // Try to extract attributes directly from attributes array
                  entry.attributes.forEach(attr => {
                    const name = attr.type;
                    const value = attr.values && attr.values.length > 0 ? attr.values[0] : '';
                    
                    if (name === 'displayName' || name === 'cn') extractedUser.displayName = value;
                    if (name === 'sAMAccountName') extractedUser.username = value;
                    if (name === 'mail') extractedUser.email = value;
                    if (name === 'title') extractedUser.title = value;
                    if (name === 'department') extractedUser.department = value;
                    if (name === 'distinguishedName') extractedUser.dn = value;
                  });
                  
                  // Only add if we got at least some info
                  if (extractedUser.displayName || extractedUser.username) {
                    logger.api.debug(`Recovered partial user data: ${JSON.stringify(extractedUser)}`);
                    users.push(extractedUser);
                  }
                } catch (extractErr) {
                  logger.api.error('Failed to extract user from incomplete entry:', extractErr);
                }
              }
            }
          });
          
          res.on('error', (err) => {
            logger.api.error('AD search error:', err);
            // Don't reject here, as we might have already found some users
            // Just log the error and continue
          });
          
          res.on('end', (result) => {
            logger.api.info(`AD user search complete, found ${users.length} users`);
            
            // If we got empty results but no error, log more debug info
            if (users.length === 0) {
              logger.api.debug('No users found. This could be due to:');
              logger.api.debug('1. No matching users exist');
              logger.api.debug('2. BaseDN is incorrect');
              logger.api.debug('3. Search filter is too restrictive');
              logger.api.debug('4. Service account lacks permissions');
            }
            
            client.unbind();
            resolve(users);
          });
        });
      });
    } catch (err) {
      logger.api.error('Error in AD search process:', err);
      
      // Ensure client is unbound in case of error
      try {
        client.unbind();
      } catch (unbindErr) {
        logger.api.debug('Error unbinding client:', unbindErr);
      }
      
      reject(err);
    }
  });
};

// Helper function to safely escape special characters in LDAP search filters
function escapeLdapFilterValue(value) {
  // Replace special characters that need to be escaped in LDAP filter
  return value.replace(/[\\()*]/g, (char) => `\\${char.charCodeAt(0).toString(16)}`);
}

export default router;
