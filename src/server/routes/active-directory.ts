import express from 'express';
import { Client } from 'ldapts';
import logger from '../utils/logger.js';
import { executeQuery } from '../utils/dbConnection.js';
import SystemConfigService from '../services/system-config-service.js';
import * as ldapService from '../lib/ldapService.js';

const router = express.Router();

// Types for Active Directory settings
interface ActiveDirectorySettings {
  server: string;
  username: string;
  password: string;
  domain: string;
  baseDN: string;
  protocol: 'ldap' | 'ldaps';
  enabled: boolean;
  authFormat: 'dn' | 'upn';
}

interface UserData {
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  department?: string;
  company?: string;
  office?: string;
  password: string;
  ou: string;
  acl?: string;
}

interface AdUser {
  displayName: string;
  username: string;
  email: string;
  title: string;
  department: string;
  dn: string;
}

// Get AD settings from database
const getActiveDirectorySettings = async (req: express.Request): Promise<ActiveDirectorySettings | null> => {
  try {
    // Get database pool from app locals
    const dbPool = req.app.locals.dbPool;
    const systemConfigService = new SystemConfigService(dbPool);
    
    // Get AD configuration from database
    const adConfig = await systemConfigService.getActiveDirectoryConfig();
    
    if (adConfig) {
      logger.api.debug('Retrieved AD settings from database');
      return adConfig as ActiveDirectorySettings;
    }
    
    logger.api.warn('No AD settings found in database');
    return null;
  } catch (error) {
    logger.api.error('Failed to get AD settings from database:', error);
    return null;
  }
};

// Format bind credentials based on authentication format
const formatBindCredential = (settings: ActiveDirectorySettings, username: string): string => {
  if (settings.authFormat === 'upn') {
    // User Principal Name format: user@domain.com
    if (username.includes('@')) {
      return username; // Already in UPN format
    }
    return `${username}@${settings.domain}`;
  } else {
    // Distinguished Name format: CN=user,DC=domain,DC=com
    if (username.includes('CN=')) {
      return username; // Already in DN format
    }
    // Convert domain to DN format
    const domainParts = settings.domain.split('.');
    const domainDN = domainParts.map(part => `DC=${part}`).join(',');
    return `CN=${username},CN=Users,${domainDN}`;
  }
};

// Create LDAP client with ldapts
const createLdapClient = (settings: ActiveDirectorySettings): Client => {
  const url = `${settings.protocol}://${settings.server}`;
  
  const clientOptions: any = {
    url,
    timeout: 30000,
    connectTimeout: 30000,
  };

  // Add TLS options for LDAPS
  if (settings.protocol === 'ldaps') {
    clientOptions.tlsOptions = {
      rejectUnauthorized: false,
      secureProtocol: 'TLSv1_2_method'
    };
  }

  const client = new Client(clientOptions);
  
  logger.api.debug(`Created LDAP client for ${url}`);
  return client;
};

// Test LDAP connection
const testLdapConnection = async (settings: ActiveDirectorySettings): Promise<{ success: boolean; message?: string; error?: string }> => {
  const client = createLdapClient(settings);
  
  try {
    const bindDN = formatBindCredential(settings, settings.username);
    logger.api.debug(`Testing connection with bind DN: ${bindDN}`);
    
    await client.bind(bindDN, settings.password);
    await client.unbind();
    
    logger.api.info('LDAP connection test successful');
    return { success: true, message: 'Connection successful' };
  } catch (err: any) {
    logger.api.error('LDAP connection test failed:', err);
    return { success: false, error: err.message };
  }
};

// Encode password for Active Directory
const encodeUnicodePwd = (password: string): Buffer => {
  const newPassword = `"${password}"`;
  return Buffer.from(newPassword, 'utf16le');
};

// Check if user exists in Active Directory
const checkUserExists = async (settings: ActiveDirectorySettings, username: string): Promise<{ exists: boolean; dn?: string }> => {
  const client = createLdapClient(settings);
  
  try {
    const bindDN = formatBindCredential(settings, settings.username);
    await client.bind(bindDN, settings.password);
    
    const filter = `(&(objectClass=user)(sAMAccountName=${ldapService.escapeFilter(username)}))`;
    const searchOptions = {
      filter,
      scope: 'sub' as const,
      attributes: ['distinguishedName']
    };
    
    logger.api.debug(`Searching for user ${username} with filter: ${filter}`);
    
    const { searchEntries } = await client.search(settings.baseDN, searchOptions);
    
    await client.unbind();
    
    if (searchEntries.length > 0) {
      const userDN = searchEntries[0].dn;
      logger.api.info(`User ${username} already exists with DN: ${userDN}`);
      return { exists: true, dn: userDN };
    }
    
    return { exists: false };
  } catch (err: any) {
    logger.api.error('Error in user existence check process:', err);
    try {
      await client.unbind();
    } catch (unbindErr) {
      logger.api.debug('Error unbinding client:', unbindErr);
    }
    throw err;
  }
};

// Function to check if OU exists and create it if needed
const ensureOUExists = async (client: Client, ouPath: string, settings: ActiveDirectorySettings): Promise<boolean> => {
  try {
    // Skip if it's the default Users container
    if (ouPath.startsWith('CN=Users')) {
      return true;
    }
    
    logger.api.debug(`Checking if OU exists: ${ouPath}`);
    
    try {
      // Search for the OU
      const searchOptions = {
        filter: '(objectClass=*)',
        scope: 'base' as const
      };
      
      await client.search(ouPath, searchOptions);
      logger.api.debug(`OU exists: ${ouPath}`);
      return true;
    } catch (err: any) {
      // If OU doesn't exist, create it
      if (err.message.includes('No Such Object') || err.code === 32) {
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
        
        await client.add(ouPath, entry);
        logger.api.info(`Successfully created OU: ${ouPath}`);
        return true;
      } else {
        // Other search error
        logger.api.error(`Error searching for OU ${ouPath}: ${err}`);
        throw err;
      }
    }
  } catch (err: any) {
    logger.api.error(`Error in ensureOUExists: ${err}`);
    throw err;
  }
};

// Helper function to get the default Users container DN dynamically
const getDefaultUsersDN = (baseDN: string): string => {
  // Extract the DC components from baseDN
  const dcParts = baseDN.match(/DC=[^,]+/gi);
  if (dcParts) {
    return `CN=Users,${dcParts.join(',')}`;
  }
  // Fallback to baseDN if no DC parts found
  return `CN=Users,${baseDN}`;
};

// Create user in AD - enhanced to handle existing users
const createLdapUser = async (settings: ActiveDirectorySettings, userData: UserData): Promise<any> => {
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
    let userDN: string;
    let userCreated = false;
    
    if (userCheck.exists) {
      logger.api.info(`User ${userData.username} already exists, skipping creation`);
      userDN = userCheck.dn!;
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
      let unicodePwd: Buffer;
      try {
        unicodePwd = encodeUnicodePwd(userData.password);
        logger.api.debug(`Successfully encoded password for user ${userData.username}`);
      } catch (pwdError: any) {
        logger.api.error('Failed to encode password:', pwdError);
        throw new Error(`Password encoding failed: ${pwdError.message}`);
      }
      
      // Create user entry object with careful attribute typing
      const entry: any = {
        objectClass: ['top', 'person', 'organizationalPerson', 'user'],
        cn: userData.displayName,
        sn: userData.lastName || userData.displayName.split(' ').pop() || userData.displayName,
        givenName: userData.firstName || userData.displayName.split(' ')[0] || userData.displayName,
        displayName: userData.displayName,
        sAMAccountName: userData.username,
        userAccountControl: '512', // Enable account
        unicodePwd: unicodePwd
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
      
      // Log the entry object for debugging (without the password)
      const debugEntry = { ...entry };
      delete debugEntry.unicodePwd;
      logger.api.debug('Creating user with attributes:', JSON.stringify(debugEntry));
      
      // Create the user with enhanced error logging
      try {
        await client.add(userDN, entry);
        logger.api.info(`User ${userData.username} created successfully with DN: ${userDN}`);
      } catch (err: any) {
        logger.api.error(`Error creating user: ${err.message}`);
        if (err.code) {
          logger.api.error(`LDAP add error code: ${err.code}`);
        }
        // Enhanced logging for attribute syntax errors
        if (err.message.includes('Invalid attribute syntax')) {
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
      
      userCreated = true;
    }
    
    // Always attempt to add to security groups (regardless of whether user was created or already existed)
    const groupResults: string[] = [];
    
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
      details: {
        samAccountName: userData.username,
        displayName: userData.displayName,
        distinguishedName: userDN,
        groups: groupResults,
      }
    };
    
  } catch (err: any) {
    logger.api.error('Error in AD user creation process:', err);
    
    // Ensure client is unbound in case of error
    try {
      await client.unbind();
    } catch (unbindErr) {
      logger.api.debug('Error unbinding client:', unbindErr);
    }
    
    // Return failure with details
    throw {
      success: false,
      error: `Failed to process AD user: ${err.message}`
    };
  }
};

// Helper function to add user to a group with fallback search strategy
const addUserToGroup = async (client: Client, userDN: string, groupName: string, settings: ActiveDirectorySettings): Promise<void> => {
  logger.api.debug(`Searching for group: ${groupName} with fallback strategy`);
  
  // Extract root DN from base DN (get just the DC components)
  const extractRootDN = (baseDN: string): string => {
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
  
  // Function to search in a specific base
  for (const searchBase of searchBases) {
    try {
      logger.api.debug(`Searching for group ${groupName} in: ${searchBase}`);
      
      const searchOptions = {
        filter: `(&(objectClass=group)(cn=${groupName}))`,
        scope: 'sub' as const,
        attributes: ['distinguishedName']
      };
      
      const { searchEntries } = await client.search(searchBase, searchOptions);
      
      if (searchEntries.length > 0) {
        const groupDN = searchEntries[0].dn;
        logger.api.info(`Found group ${groupName} at: ${groupDN}`);
        
        // Group found, now add user to it
        const change: any = {
          operation: 'add',
          modification: {
            member: userDN
          }
        };
        
        logger.api.debug(`Adding user ${userDN} to group ${groupDN}`);
        
        try {
          await client.modify(groupDN, [change]);
          logger.api.info(`Successfully added user to group ${groupName} (found in ${searchBase})`);
          return;
        } catch (err: any) {
          // If the error is that the user is already a member, that's ok
          if (err.message.includes('already exists') || err.code === 68) {
            logger.api.info(`User ${userDN} is already a member of ${groupName}`);
            return;
          }
          logger.api.error(`Error adding user to group ${groupName}:`, err);
          throw err;
        }
      } else {
        logger.api.debug(`Group ${groupName} not found in ${searchBase}, trying next location`);
      }
    } catch (err: any) {
      logger.api.warn(`Error searching for group ${groupName} in ${searchBase}:`, err);
      // Continue to next search base
    }
  }
  
  // If we get here, group was not found in any location
  logger.api.warn(`Group ${groupName} not found in any search location`);
  throw new Error(`Group ${groupName} not found in any location`);
};

// Function to search for users in Active Directory
const searchAdUsers = async (settings: ActiveDirectorySettings, query: string): Promise<AdUser[]> => {
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
    const searchFilter = `(&(objectClass=user)(objectCategory=person)(|(displayName=*${safeQuery}*)(sAMAccountName=*${safeQuery}*)(mail=*${safeQuery}*)(givenName=*${safeQuery}*)(sn=*${safeQuery}*)))`;
    
    // Specify which attributes to return
    const searchOptions = {
      filter: searchFilter,
      scope: 'sub' as const,
      sizeLimit: 100, // Limit results but more generous
      attributes: ['displayName', 'sAMAccountName', 'mail', 'title', 'department', 'distinguishedName', 'givenName', 'sn']
    };
    
    logger.api.debug(`Searching with filter: ${searchFilter}`);
    logger.api.debug(`Search base: ${settings.baseDN}`);
    
    const { searchEntries } = await client.search(settings.baseDN, searchOptions);
    
    await client.unbind();
    
    const users: AdUser[] = searchEntries.map(entry => {
      const user: AdUser = {
        displayName: (entry.displayName as string) || (entry.cn as string) || '',
        username: (entry.sAMAccountName as string) || '',
        email: (entry.mail as string) || '',
        title: (entry.title as string) || '',
        department: (entry.department as string) || '',
        dn: entry.dn || ''
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
    
    return users;
  } catch (err: any) {
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
export const getAdUserInfo = async (settings: ActiveDirectorySettings, username: string): Promise<any> => {
  let sam = username;
  if (sam.includes('@')) {
    sam = sam.split('@')[0];
  }

  const filter = `(&(objectClass=user)(sAMAccountName=*${ldapService.escapeFilter(sam)}*))`;
  const attrs = [
    'displayName',
    'title',
    'department',
    'mail',
    'sAMAccountName',
    'distinguishedName'
  ];

  try {
    const results = await ldapService.search(settings.baseDN, filter, attrs);
    const info = results[0];
    return {
      displayName: info?.displayName || '',
      title: info?.title || '',
      department: info?.department || '',
      mail: info?.mail || '',
      sAMAccountName: info?.sAMAccountName || '',
      distinguishedName: info?.distinguishedName || ''
    };
  } catch (err: any) {
    logger.api.error('Error fetching AD user info:', err);
    throw err;
  }
};

// Helper function to safely escape special characters in LDAP search filters
function escapeLdapFilterValue(value: string): string {
  // Replace special characters that need to be escaped in LDAP filter
  return value.replace(/[\\()*]/g, (char) => `\\${char.charCodeAt(0).toString(16)}`);
}

// Routes

// Get AD settings
router.get('/', async (req, res) => {
  try {
    const adSettings = await getActiveDirectorySettings(req);
    const safeSettings = adSettings || {
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
    if (safeSettings.password) {
      safeSettings.password = '••••••••';
    }
    
    res.json(safeSettings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get Active Directory settings', message: err.message });
  }
});

// Update AD settings
router.put('/', async (req, res) => {
  try {
    const adSettings = req.body;
    
    // Get database pool from app locals
    const dbPool = req.app.locals.dbPool;
    const systemConfigService = new SystemConfigService(dbPool);
    
    // If there's already a password saved and the incoming password is masked,
    // get the original password from database
    if (adSettings.password === '••••••••') {
      const currentSettings = await systemConfigService.getActiveDirectoryConfig();
      if (currentSettings && currentSettings.password) {
        adSettings.password = currentSettings.password;
      }
    }
    
    // Update each AD configuration field in the database
    const updatedBy = (req as any).user?.username || 'system';
    const updates = [];
    
    if (adSettings.server !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.server', adSettings.server, updatedBy));
    }
    if (adSettings.username !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.username', adSettings.username, updatedBy));
    }
    if (adSettings.password !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.password', adSettings.password, updatedBy));
    }
    if (adSettings.domain !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.domain', adSettings.domain, updatedBy));
    }
    if (adSettings.baseDN !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.base_dn', adSettings.baseDN, updatedBy));
    }
    if (adSettings.protocol !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.protocol', adSettings.protocol, updatedBy));
    }
    if (adSettings.enabled !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.enabled', adSettings.enabled.toString(), updatedBy));
    }
    if (adSettings.authFormat !== undefined) {
      updates.push(systemConfigService.updateConfig('ad.auth_format', adSettings.authFormat, updatedBy));
    }
    
    // Wait for all updates to complete
    await Promise.all(updates);
    
    // Clear cache and get updated configuration
    systemConfigService.clearCache();
    const updatedConfig = await systemConfigService.getActiveDirectoryConfig();
    
    // Don't send the password back to the client
    const safeSettings = { ...updatedConfig };
    if (safeSettings.password) {
      safeSettings.password = '••••••••';
    }
    
    res.json(safeSettings);
  } catch (err: any) {
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
      const storedSettings = await getActiveDirectorySettings(req);
      if (storedSettings && storedSettings.password) {
        logger.api.debug('Using stored password for connection test');
        finalSettings.password = storedSettings.password;
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
  } catch (err: any) {
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
          performed_by: (req as any).user?.username || 'system',
          timestamp: timestamp
        };
        
        // Insert the audit log into the database with correct column names
        try {
          await executeQuery(
            'INSERT INTO audit_logs (id, new_hire_id, action_type, status, message, details, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [audit.id, audit.new_hire_id, audit.action_type, audit.status, audit.message, audit.details, audit.performed_by, audit.timestamp]
          );
          logger.db.info(`Created audit log entry for AD operation for hire ID ${id}`);
        } catch (auditError: any) {
          // Log the specific SQL error details for audit log insertion
          logger.db.error(`Audit log creation error for hire ID ${id}:`, auditError);
          if (auditError.originalError?.info) {
            logger.db.error('SQL error details:', auditError.originalError.info);
          }
          // Continue execution even if audit log fails - we still want to return success
          logger.db.warn('AD operation completed but audit log creation failed');
        }
      } catch (dbError: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    logger.api.error('Error searching AD users:', err);
    res.status(500).json({ 
      success: false, 
      error: `Failed to search AD users: ${err.message}` 
    });
  }
});

export default router;