// src/server/services/active-directory.js

import { getClient, search, escapeFilter } from '../lib/ldapService.js';
import logger from '../utils/logger.js';
import SystemConfigService from './system-config-service.js';
import { getDbPool } from '../utils/dbConnection.js';

// Initialize system config service with lazy loading
let systemConfigService = null;

const getSystemConfigService = () => {
  if (!systemConfigService) {
    const dbPool = getDbPool();
    if (dbPool) {
      systemConfigService = new SystemConfigService(dbPool);
    }
  }
  return systemConfigService;
};

/**
 * Get Active Directory settings from database
 */
export async function getActiveDirectorySettings() {
  try {
    const configService = getSystemConfigService();
    if (!configService) {
      throw new Error('Database connection not available');
    }
    
    const adConfig = await configService.getActiveDirectoryConfig();
    
    if (!adConfig) {
      throw new Error('Active Directory configuration not found in database');
    }
    
    return adConfig;
  } catch (error) {
    logger.api.error('Failed to get AD configuration from database:', error);
    throw error;
  }
}

/**
 * Test LDAP connection
 */
export async function testLdapConnection() {
  try {
    const client = await getClient();
    await client.unbind();
    return { success: true, message: 'LDAP connection successful' };
  } catch (error) {
    logger.api.error('LDAP connection test failed:', error);
    return { 
      success: false, 
      message: error.message || 'LDAP connection failed' 
    };
  }
}

/**
 * Search for users in Active Directory
 */
export async function searchAdUsers(username) {
  try {
    const settings = await getActiveDirectorySettings();
    const escapedUsername = escapeFilter(username);
    
    // Search by multiple attributes to find the user
    const filter = `(&(objectClass=user)(|(sAMAccountName=${escapedUsername})(userPrincipalName=${escapedUsername})(mail=${escapedUsername})))`;
    
    const attributes = [
      'sAMAccountName',
      'userPrincipalName', 
      'displayName',
      'givenName',
      'sn',
      'mail',
      'title',
      'department',
      'distinguishedName'
    ];
    
    const results = await search(settings.baseDN, filter, attributes);
    
    // Transform results to expected format
    return results.map(entry => ({
      username: entry.sAMAccountName || entry.userPrincipalName,
      displayName: entry.displayName || `${entry.givenName || ''} ${entry.sn || ''}`.trim(),
      firstName: entry.givenName || '',
      lastName: entry.sn || '',
      email: entry.mail || '',
      title: entry.title || '',
      department: entry.department || '',
      dn: entry.distinguishedName
    }));
  } catch (error) {
    logger.api.error('Error searching AD users:', error);
    throw error;
  }
}

/**
 * Authenticate user against Active Directory
 */
export async function authenticateAdUser(username, password) {
  try {
    const settings = await getActiveDirectorySettings();
    
    // Format bind DN based on authFormat
    let bindDN;
    if (settings.authFormat === 'dn') {
      // Search for user first to get DN
      const users = await searchAdUsers(username);
      if (!users || users.length === 0) {
        return { success: false, message: 'User not found in Active Directory' };
      }
      bindDN = users[0].dn;
    } else {
      // Use UPN format
      bindDN = username.includes('@') ? username : `${username}@${settings.domain}`;
    }
    
    // Try to bind with user credentials
    const { Client } = await import('ldapts');
    const protocol = settings.protocol || 'ldap';
    const port = protocol === 'ldaps' ? 636 : 389;
    const url = `${protocol}://${settings.server}:${port}`;
    
    const client = new Client({
      url,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    try {
      await client.bind(bindDN, password);
      await client.unbind();
      
      // Get user details after successful authentication
      const users = await searchAdUsers(username);
      if (users && users.length > 0) {
        return { 
          success: true, 
          user: users[0],
          message: 'Authentication successful' 
        };
      } else {
        return { 
          success: false, 
          message: 'Authentication successful but user details not found' 
        };
      }
    } catch (bindError) {
      logger.api.warn(`LDAP authentication failed for user ${username}:`, bindError.message);
      return { 
        success: false, 
        message: 'Invalid credentials' 
      };
    }
  } catch (error) {
    logger.api.error('Error during AD authentication:', error);
    return { 
      success: false, 
      message: 'Authentication service error' 
    };
  }
}

/**
 * Check if Active Directory is properly configured
 */
export async function isAdConfigured() {
  try {
    const settings = await getActiveDirectorySettings();
    return !!(settings && settings.server && settings.baseDN && settings.username && settings.password);
  } catch (error) {
    return false;
  }
}

export default {
  getActiveDirectorySettings,
  testLdapConnection,
  searchAdUsers,
  authenticateAdUser,
  isAdConfigured
};