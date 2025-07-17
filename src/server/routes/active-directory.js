import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { Client, Change, Attribute } from 'ldapts';
import { executeQuery } from '../utils/dbConnection.js';
import logger from '../utils/logger.js';
import { search, escapeFilter } from '../lib/ldapService.js';
import SystemConfigService from '../services/system-config-service.js';

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

// Helper function to get Active Directory settings from system config
const getActiveDirectorySettings = async (req) => {
  try {
    const dbPool = req.app.locals.dbPool;
    if (!dbPool) {
      throw new Error('Database connection not available');
    }
    
    const systemConfigService = new SystemConfigService(dbPool);
    const adConfig = await systemConfigService.getActiveDirectoryConfig();
    return adConfig;
  } catch (err) {
    logger.api.error('Error reading Active Directory settings:', err);
    throw err;
  }
};

// Legacy function for backward compatibility (deprecated)
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
    
    // Use baseDN directly without forcing CN=Users
    const formattedDN = `CN=${userPart},${settings.baseDN}`;
    logger.api.debug(`Formatted DN: ${formattedDN}`);
    return formattedDN;
  }
  // if (settings.authFormat === 'dn') {
  //   // Extract the username part if it's in UPN format (user@domain.com)
  //   const userPart = username.includes('@') ? username.split('@')[0] : username;
    
  //   // Create a simple DN - customize based on your AD structure
  //   // Using format CN=username,CN=Users,DC=domain,DC=com which is more standard
  //   const formattedDN = `CN=${userPart},CN=Users,${settings.baseDN}`;
  //   logger.api.debug(`Formatted DN: ${formattedDN}`);
  //   return formattedDN;
  // }
  
  // Default to UPN format (or keep as is if it already has @domain)
  if (!username.includes('@')) {
    const upn = `${username}@${settings.domain}`;
    logger.api.debug(`Formatted UPN: ${upn}`);
    return upn;
  }
  
  logger.api.debug(`Username appears to be already in UPN format: ${username}`);
  return username;
};

// Real LDAP/AD Connection using ldapts
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
  const client = new Client({
    url: `${protocol}://${settings.server}:${port}`,
    timeout: 10000, // Increased timeout
    connectTimeout: 15000, // Increased connect timeout
    tlsOptions: tlsOptions,
    idleTimeout: 30000,
  });
  
  // Add event handler for error events
  client.on('error', (err) => {
    logger.api.error('LDAP client error event:', err.message);
    if (err.code) {
      logger.api.error(`LDAP error code: ${err.code}, name: ${err.name}`);
    }
  });
  
  return client;
};

const testLdapConnection = async (settings) => {
  try {
    if (!settings.server || !settings.username) {
      throw new Error("Missing required connection parameters");
    }
    
    if (!settings.password) {
      throw new Error("Password is required for authentication");
    }

    // Log connection attempt without password
    logger.api.debug(`Testing LDAP connection to server: ${settings.server} with protocol: ${settings.protocol}`);
    logger.api.debug(`Using authentication format: ${settings.authFormat}`);
    
    const client = createLdapClient(settings);
    
    // Format the bind credentials based on settings
    const bindDN = formatBindCredential(settings, settings.username);
    logger.api.debug(`Attempting LDAP bind with DN: ${bindDN}`);
    logger.api.debug(`Password length: ${settings.password ? settings.password.length : 0} characters`);
    
    // Bind with the provided credentials
    try {
      await client.bind(bindDN, settings.password);
      logger.api.info('LDAP bind successful');
      
      // Perform a simple search to verify full connectivity
      const baseDN = settings.baseDN;
      const opts = {
        filter: '(objectClass=*)',
        scope: 'base',
        sizeLimit: 1,
        attributes: ['objectClass']
      };
      
      logger.api.debug(`Performing test search with baseDN: ${baseDN}`);
      
      const { searchEntries } = await client.search(baseDN, opts);
      logger.api.debug(`Search successful, found ${searchEntries.length} entries`);
      
      // Unbind and cleanup
      await client.unbind();
      
      return {
        success: true,
        message: 'Connection successful',
        details: {
          server: settings.server,
          baseDN: settings.baseDN,
          protocol: settings.protocol || 'ldap'
        }
      };
    } catch (bindErr) {
      logger.api.error('LDAP bind failed:', bindErr);
      
      // Try to unbind even if bind failed
      try {
        await client.unbind();
      } catch (unbindErr) {
        // Ignore unbind errors after failed bind
      }
      
      throw new Error(`Authentication failed: ${bindErr.message}`);
    }
  } catch (err) {
    logger.api.error('LDAP connection test failed:', err);
    return {
      success: false,
      message: err.message,
      details: {
        server: settings.server,
        error: err.toString()
      }
    };
  }
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

// Add function to check if user exists in AD
const checkUserExists = async (settings, username) => {
  try {
    const client = createLdapClient(settings);
    
    // Format the bind credentials based on settings
    const bindDN = formatBindCredential(settings, settings.username);
    logger.api.debug(`Checking if user ${username} exists in AD`);
    
    // Bind with service account
    await client.bind(bindDN, settings.password);
    
    // Search for the user by sAMAccountName
    const searchFilter = `(&(objectClass=user)(sAMAccountName=${username}))`;
    const searchOptions = {
      filter: searchFilter,
      scope: 'sub',
      attributes: ['sAMAccountName', 'distinguishedName', 'displayName']
    };
    
    logger.api.debug(`Searching for user with filter: ${searchFilter}`);
    
    const { searchEntries } = await client.search(settings.baseDN, searchOptions);
    
    // Unbind after search
    await client.unbind();
    
    if (searchEntries && searchEntries.length > 0) {
      const userDN = searchEntries[0].dn;
      logger.api.info(`User ${username} already exists with DN: ${userDN}`);
      
      return {
        exists: true,
        dn: userDN,
        displayName: searchEntries[0].displayName || username
      };
    }
    
    logger.api.info(`User ${username} does not exist in AD`);
    return { exists: false };
    
  } catch (err) {
    logger.api.error('Error checking if user exists:', err);
    throw err;
  }
};

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
    
    // Test connection using ldapts
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
    const adSettings = await getActiveDirectorySettings(req);
    if (!adSettings || !adSettings.enabled) {
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
    
    // Create user in AD using ldapts (now handles existing users)
    const result = await createLdapUser(adSettings, userData);
    
    // If successful (either created or updated existing), update the hire record
    if (result.success) {
      try {
        // Update account status to Active
        await executeQuery('UPDATE hires SET account_creation_status = ? WHERE id = ?', ['Active', id]);
        logger.db.info(`Updated account_creation_status to 'Active' for hire ID ${id}`);
        
        // Add appropriate audit log entry based on whether user was created or updated
        const timestamp = new Date().toISOString();
        const actionType = result.userCreated ? 'AD_ACCOUNT_CREATED' : 'AD_GROUPS_UPDATED';
        const message = result.userCreated 
          ? `Active Directory account created for user ${userData.username}`
          : `Active Directory groups updated for existing user ${userData.username}`;
        
        const audit = {
          id: Math.random().toString(36).slice(2),
          new_hire_id: id,
          action_type: actionType,
          status: 'Success',
          message: message,
          details: JSON.stringify({
            username: userData.username,
            displayName: userData.displayName,
            ou: userData.ou,
            userAlreadyExisted: !result.userCreated,
            groupsAdded: result.details?.groups || []
          }),
          performed_by: req.user?.username || 'system',
          timestamp: timestamp
        };
        
        // Insert the audit log into the database with correct column names
        try {
          await executeQuery(
            'INSERT INTO audit_logs (id, new_hire_id, action_type, status, message, details, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [audit.id, audit.new_hire_id, audit.action_type, audit.status, audit.message, audit.details, audit.performed_by, audit.timestamp]
          );
          logger.db.info(`Created audit log entry for AD operation for hire ID ${id}`);
        } catch (auditError) {
          // Log the specific SQL error details for audit log insertion
          logger.db.error(`Audit log creation error for hire ID ${id}:`, auditError);
          if (auditError.originalError?.info) {
            logger.db.error('SQL error details:', auditError.originalError.info);
          }
          // Continue execution even if audit log fails - we still want to return success
          logger.db.warn('AD operation completed but audit log creation failed');
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
          warning: "AD operation completed but database update failed. Please check database schema."
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

// Add this function around line 500, before the createLdapUser function
// Function to check if OU exists and create it if needed
const ensureOUExists = async (client, ouPath, settings) => {
  // Skip if it's the default Users container
  if (ouPath.startsWith('CN=Users')) {
    return true;
  }
  
  logger.api.debug(`Checking if OU exists: ${ouPath}`);
  
  try {
    // Search for the OU
    const { searchEntries } = await client.search(ouPath, {
      scope: 'base',
      filter: '(objectClass=*)'
    });
    
    // If we get here, the OU exists
    logger.api.debug(`OU exists: ${ouPath}`);
    return true;
  } catch (err) {
    // If error code is "No Such Object", we need to create the OU
    if (err.code === 0x20 || err.message.includes('No Such Object')) {
      logger.api.info(`OU does not exist: ${ouPath}, attempting to create it`);
      
      // Parse the OU path to get the components
      const ouMatch = ouPath.match(/OU=([^,]+),(.*)/); 
      if (!ouMatch) {
        throw new Error(`Invalid OU path format: ${ouPath}`);
      }
      
      const ouName = ouMatch[1];
      const parentDN = ouMatch[2];
      
      // First ensure parent OU exists (recursive call)
      if (parentDN.startsWith('OU=')) {
        await ensureOUExists(client, parentDN, settings);
      }
      
      // Now create the current OU
      const entry = {
        objectClass: ['top', 'organizationalUnit'],
        ou: ouName
      };
      
      try {
        await client.add(ouPath, entry);
        logger.api.info(`Successfully created OU: ${ouPath}`);
        return true;
      } catch (addErr) {
        logger.api.error(`Error creating OU ${ouPath}: ${addErr}`);
        throw addErr;
      }
    } else {
      // Other search error
      logger.api.error(`Error searching for OU ${ouPath}: ${err}`);
      throw err;
    }
  }
};

// Helper function to get the default Users container DN dynamically
const getDefaultUsersDN = (baseDN) => {
  // Extract the DC components from baseDN
  const dcParts = baseDN.match(/DC=[^,]+/gi);
  if (dcParts) {
    return `CN=Users,${dcParts.join(',')}`;
  }
  // Fallback to baseDN if no DC parts found
  return `CN=Users,${baseDN}`;
};

// Create user in AD - enhanced to handle existing users
const createLdapUser = async (settings, userData) => {
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
    await client.bind(bindDN, settings.password);
    
    logger.api.debug('Successfully bound to AD, checking if user exists');
    
    // Check if user already exists
    const userCheck = await checkUserExists(settings, userData.username);
    let userDN;
    let userCreated = false;
    
    if (userCheck.exists) {
      logger.api.info(`User ${userData.username} already exists, skipping creation`);
      userDN = userCheck.dn;
      userCreated = false;
    } else {
      logger.api.debug('User does not exist, creating new user');
      
      // Create user DN and ensure OU exists
      userDN = `CN=${userData.displayName},${userData.ou}`;
      logger.api.debug(`User DN will be: ${userDN}`);

      // Ensure the OU exists before creating user
      try {
        logger.api.debug(`Ensuring OU exists: ${userData.ou}`);
        await ensureOUExists(client, userData.ou, settings);
        logger.api.info(`OU verified or created: ${userData.ou}`);
      } catch (ouErr) {
        logger.api.error(`Failed to verify/create OU: ${ouErr}`);
        // If OU creation fails, fall back to Users container using dynamic DN
        const defaultUsersDN = getDefaultUsersDN(settings.baseDN);
        userDN = `CN=${userData.displayName},${defaultUsersDN}`;
        logger.api.warn(`Falling back to default Users container: ${userDN}`);
      }

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
      try {
        await client.add(userDN, entry);
        logger.api.info(`User ${userData.username} created successfully with DN: ${userDN}`);
        userCreated = true;
      } catch (err) {
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
        throw err;
      }
    }
    
    // Always attempt to add to security groups (regardless of whether user was created or already existed)
    const groupResults = [];
    
    if (userData.acl) {
      try {
        await addUserToGroup(client, userDN, userData.acl, settings);
        logger.api.debug(`Added user to ${userData.acl} group`);
        groupResults.push(userData.acl);
      } catch (groupErr) {
        logger.api.warn(`Failed to add user to ${userData.acl} group:`, groupErr);
        // Continue even if group add fails
      }
    }
    
    // Always add to VPN-USERS group
    try {
      await addUserToGroup(client, userDN, 'VPN-USERS', settings);
      logger.api.debug(`Added user to VPN-USERS group`);
      groupResults.push('VPN-USERS');
    } catch (vpnErr) {
      logger.api.warn(`Failed to add user to VPN-USERS group:`, vpnErr);
      // Continue even if group add fails
    }
    
    // Unbind when done
    await client.unbind();
    logger.api.debug('Successfully unbound from AD server');
    
    // Return success with information about what was done
    const successMessage = userCreated 
      ? "Active Directory account created successfully"
      : "User already exists in Active Directory, groups updated successfully";
      
    return {
      success: true,
      message: successMessage,
      userCreated: userCreated,
      userDN: userDN,
      groups: groupResults
    };
    
  } catch (err) {
    logger.api.error('Error in createLdapUser:', err);
    
    // Ensure we unbind even on error
    try {
      await client.unbind();
    } catch (unbindErr) {
      logger.api.debug('Error unbinding after failure:', unbindErr);
    }
    
    throw err;
  }
};

// Helper function to add user to a group with fallback search strategy
const addUserToGroup = async (client, userDN, groupName, settings) => {
  logger.api.debug(`Searching for group: ${groupName} with fallback strategy`);
  
  // Extract root DN from base DN (get just the DC components)
  const extractRootDN = (baseDN) => {
    const dcParts = baseDN.match(/DC=[^,]+/gi);
    return dcParts ? dcParts.join(',') : baseDN;
  };
  
  const rootDN = extractRootDN(settings.baseDN);
  
  // Define search locations in order of preference
  const searchBases = [
    settings.baseDN, // Current organizational unit
    rootDN, // Domain root
    `CN=Users,${rootDN}`, // Users container
    `CN=Builtin,${rootDN}` // Built-in container
  ];
  
  logger.api.debug(`Will search in the following locations: ${searchBases.join(' -> ')}`);
  
  // Try each search base until we find the group
  for (let baseIndex = 0; baseIndex < searchBases.length; baseIndex++) {
    const currentBase = searchBases[baseIndex];
    logger.api.debug(`Searching for group ${groupName} in: ${currentBase}`);
    
    try {
      const { searchEntries } = await client.search(currentBase, {
        filter: `(&(objectClass=group)(cn=${groupName}))`,
        scope: 'sub'
      });
      
      // Check if we found the group
      if (searchEntries.length > 0) {
        const groupDN = searchEntries[0].dn;
        logger.api.info(`Found group ${groupName} at: ${groupDN}`);
        
        // Group found, now add user to it
        const change = new Change({
          operation: 'add',
          modification: new Attribute({
            type: 'member',
            values: [userDN]
          })
        });
        
        logger.api.debug(`Adding user ${userDN} to group ${groupDN}`);
        
        try {
          await client.modify(groupDN, change);
          logger.api.info(`Successfully added user to group ${groupName} (found in ${currentBase})`);
          return;
        } catch (modifyErr) {
          // If the error is that the user is already a member, that's ok
          if (modifyErr.name === 'EntryAlreadyExistsError') {
            logger.api.info(`User ${userDN} is already a member of ${groupName}`);
            return;
          }
          logger.api.error(`Error adding user to group ${groupName}:`, modifyErr);
          throw modifyErr;
        }
      }
      
      // Group not found in this base, continue to next one
      logger.api.debug(`Group ${groupName} not found in ${currentBase}, trying next location`);
      
    } catch (searchErr) {
      logger.api.warn(`Error searching for group ${groupName} in ${currentBase}:`, searchErr);
      // Continue to next search base
    }
  }
  
  // If we get here, the group wasn't found in any location
  logger.api.warn(`Group ${groupName} not found in any search location`);
  throw new Error(`Group ${groupName} not found in any location`);
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
    const adSettings = await getActiveDirectorySettings(req);
    if (!adSettings || !adSettings.enabled) {
      return res.status(400).json({ 
        success: false, 
        error: "Active Directory integration is not enabled" 
      });
    }
    
    // Search for users
    const users = await searchAdUsers(adSettings, query);
    
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
  const client = createLdapClient(settings);
  
  try {
    // Format the bind credentials based on settings
    const bindDN = formatBindCredential(settings, settings.username);
    logger.api.debug(`Binding to AD with DN: ${bindDN} for user search`);
    logger.api.debug(`Using baseDN: ${settings.baseDN}`);
    
    // Bind with service account
    await client.bind(bindDN, settings.password);
    
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
    
    // Perform the search
    const { searchEntries } = await client.search(settings.baseDN, searchOptions);
    
    // Process the search results
    const users = searchEntries.map(entry => {
      // Log the raw entry for debugging
      logger.api.debug(`Raw search entry: ${JSON.stringify(entry)}`);
      
      const user = {
        displayName: entry.displayName || entry.cn || '',
        username: entry.sAMAccountName || '',
        email: entry.mail || '',
        title: entry.title || '',
        department: entry.department || '',
        dn: entry.distinguishedName || ''
      };
      
      logger.api.debug(`Found user: ${user.displayName} (${user.username})`);
      return user;
    });
    
    logger.api.info(`AD user search complete, found ${users.length} users`);
    
    // If we got empty results but no error, log more debug info
    if (users.length === 0) {
      logger.api.debug('No users found. This could be due to:');
      logger.api.debug('1. No matching users exist');
      logger.api.debug('2. BaseDN is incorrect');
      logger.api.debug('3. Search filter is too restrictive');
      logger.api.debug('4. Service account lacks permissions');
    }
    
    // Unbind when done
    await client.unbind();
    
    return users;
    
  } catch (err) {
    logger.api.error('Error in AD search process:', err);
    
    // Ensure client is unbound in case of error
    try {
      await client.unbind();
    } catch (unbindErr) {
      logger.api.debug('Error unbinding client:', unbindErr);
    }
    
    throw err;
  }
};

// Fetch basic user info by sAMAccountName
export const getAdUserInfo = async (settings, username) => {
  let sam = username;
  if (sam.includes('@')) {
    sam = sam.split('@')[0];
  }

  const filter = `(&(objectClass=user)(sAMAccountName=*${escapeFilter(sam)}*))`;
  const attrs = [
    'displayName',
    'title',
    'department',
    'mail',
    'sAMAccountName',
    'distinguishedName'
  ];

  try {
    const [info] = await search(settings.baseDN, filter, attrs);
    return {
      displayName: info?.displayName || '',
      title: info?.title || '',
      department: info?.department || '',
      mail: info?.mail || '',
      sAMAccountName: info?.sAMAccountName || '',
      distinguishedName: info?.distinguishedName || ''
    };
  } catch (err) {
    logger.api.error('Error fetching AD user info:', err);
    throw err;
  }
};

// Helper function to safely escape special characters in LDAP search filters
function escapeLdapFilterValue(value) {
  // Replace special characters that need to be escaped in LDAP filter
  return value.replace(/[\\()*]/g, (char) => `\\${char.charCodeAt(0).toString(16)}`);
}

export default router;
