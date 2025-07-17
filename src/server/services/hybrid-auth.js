import { executeQuery } from '../utils/dbConnection.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';
import { searchAdUsers, testLdapConnection, authenticateAdUser } from './active-directory.js';

/**
 * Get authentication configuration from database
 */
export const getAuthConfig = async () => {
  try {
    const authModeQuery = `
      SELECT config_value 
      FROM system_configurations 
      WHERE config_key = 'auth_mode'
    `;
    
    const ldapFallbackQuery = `
      SELECT config_value 
      FROM system_configurations 
      WHERE config_key = 'ldap_fallback_enabled'
    `;
    
    const [authModeResult, ldapFallbackResult] = await Promise.all([
      executeQuery(authModeQuery),
      executeQuery(ldapFallbackQuery)
    ]);
    
    return {
      authMode: authModeResult[0]?.config_value || 'local',
      ldapFallbackEnabled: ldapFallbackResult[0]?.config_value === 'true'
    };
  } catch (error) {
    logger.api.error('Error getting auth config:', error);
    return {
      authMode: 'local',
      ldapFallbackEnabled: true
    };
  }
};

/**
 * Update authentication configuration
 */
export const updateAuthConfig = async (authMode, ldapFallbackEnabled) => {
  try {
    const updateAuthModeQuery = `
      UPDATE system_configurations 
      SET config_value = ?, updated_at = GETDATE()
      WHERE config_key = 'auth_mode'
    `;
    
    const updateLdapFallbackQuery = `
      UPDATE system_configurations 
      SET config_value = ?, updated_at = GETDATE()
      WHERE config_key = 'ldap_fallback_enabled'
    `;
    
    await Promise.all([
      executeQuery(updateAuthModeQuery, [authMode]),
      executeQuery(updateLdapFallbackQuery, [ldapFallbackEnabled ? 'true' : 'false'])
    ]);
    
    logger.api.info(`Authentication configuration updated: mode=${authMode}, fallback=${ldapFallbackEnabled}`);
    return true;
  } catch (error) {
    logger.api.error('Error updating auth config:', error);
    throw error;
  }
};

/**
 * Authenticate user with local credentials
 */
export const authenticateLocal = async (username, password) => {
  try {
    // Look for any user with the username, regardless of authentication_type
    // This allows users to authenticate locally even if they were created via LDAP
    const users = await executeQuery(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );
    
    if (users.length === 0) {
      return null;
    }
    
    const user = users[0];
    
    // Check if user has a password set (LDAP users might have empty passwords)
    if (!user.password || user.password === '') {
      logger.api.warn(`User ${username} has no local password set`);
      return null;
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        approved: user.approved,
        authenticationType: 'local'
      };
    }
    
    return null;
  } catch (error) {
    logger.api.error('Error in local authentication:', error);
    throw error;
  }
};

/**
 * Authenticate user with LDAP/Active Directory
 */
export const authenticateLdap = async (username, password) => {
  try {
    // First check if LDAP is configured and working
    const ldapTest = await testLdapConnection();
    if (!ldapTest.success) {
      logger.api.warn('LDAP connection test failed:', ldapTest.message);
      return null;
    }
    
    // Import the proper AD authentication function
    
    // Authenticate against Active Directory with actual password validation
    const authResult = await authenticateAdUser(username, password);
    if (!authResult.success) {
      logger.api.warn(`LDAP authentication failed for ${username}: ${authResult.message}`);
      return null;
    }
    
    const adUser = authResult.user;
    
    // Check if user exists in our local database
    let localUser = await executeQuery(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );
    
    // If user doesn't exist locally, create them
    if (localUser.length === 0) {
      const userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      await executeQuery(
        'INSERT INTO users (id, username, password, role, authentication_type, approved) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, '', 'support', 'ldap', 1]
      );
      
      localUser = [{
        id: userId,
        username: username,
        role: 'support',
        authentication_type: 'ldap',
        approved: 1
      }];
      
      logger.api.info(`Created local user record for LDAP user: ${username}`);
    } else {
      // Update existing user's authentication type if needed
      if (localUser[0].authentication_type !== 'ldap') {
        await executeQuery(
          'UPDATE users SET authentication_type = ? WHERE username = ?',
          ['ldap', username]
        );
        localUser[0].authentication_type = 'ldap';
      }
    }
    
    return {
      id: localUser[0].id,
      username: localUser[0].username,
      role: localUser[0].role,
      approved: localUser[0].approved,
      authenticationType: 'ldap',
      adInfo: {
        displayName: adUser.displayName,
        email: adUser.email,
        department: adUser.department
      }
    };
  } catch (error) {
    logger.api.error('Error in LDAP authentication:', error);
    return null;
  }
};

/**
 * Hybrid authentication - tries multiple methods based on configuration
 */
export const authenticateHybrid = async (username, password, preferredMethod = null) => {
  try {
    const config = await getAuthConfig();
    logger.api.info(`Hybrid authentication for ${username}, mode: ${config.authMode}, preferred: ${preferredMethod}`);
    
    let authResult = null;
    
    // If user specified a preferred method, try that first
    if (preferredMethod === 'ldap' || (preferredMethod === null && config.authMode === 'ldap')) {
      logger.api.info(`Attempting LDAP authentication for ${username}`);
      authResult = await authenticateLdap(username, password);
      
      if (authResult) {
        logger.api.info(`LDAP authentication successful for ${username}`);
        return authResult;
      }
      
      // If LDAP failed and fallback is enabled, try local
      if (config.ldapFallbackEnabled) {
        logger.api.info(`LDAP authentication failed, trying local fallback for ${username}`);
        authResult = await authenticateLocal(username, password);
        if (authResult) {
          logger.api.info(`Local fallback authentication successful for ${username}`);
          return authResult;
        }
      }
    } else if (preferredMethod === 'local' || (preferredMethod === null && config.authMode === 'local')) {
      logger.api.info(`Attempting local authentication for ${username}`);
      authResult = await authenticateLocal(username, password);
      
      if (authResult) {
        logger.api.info(`Local authentication successful for ${username}`);
        return authResult;
      }
    } else if (config.authMode === 'hybrid') {
      // In hybrid mode, try both methods
      logger.api.info(`Attempting hybrid authentication for ${username}`);
      
      // Try local first, then LDAP
      authResult = await authenticateLocal(username, password);
      if (authResult) {
        logger.api.info(`Local authentication successful in hybrid mode for ${username}`);
        return authResult;
      }
      
      authResult = await authenticateLdap(username, password);
      if (authResult) {
        logger.api.info(`LDAP authentication successful in hybrid mode for ${username}`);
        return authResult;
      }
    }
    
    logger.api.warn(`All authentication methods failed for ${username}`);
    return null;
  } catch (error) {
    logger.api.error('Error in hybrid authentication:', error);
    throw error;
  }
};