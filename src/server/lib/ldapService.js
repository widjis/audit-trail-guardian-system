// src/server/services/ldapService.js

import { Client, Change, Attribute } from 'ldapts';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import SystemConfigService from '../services/system-config-service.js';
import { getDbPool } from '../utils/dbConnection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
async function getActiveDirectorySettings() {
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
    console.error('[LDAP Service] Failed to get AD configuration from database:', error);
    throw error;
  }
}

/**
 * Format bind DN based on authFormat
 */
function formatBindCredential(settings, username) {
  if (username.startsWith('CN=')) return username;
  if (settings.authFormat === 'dn') {
    const userPart = username.includes('@') ? username.split('@')[0] : username;
    return `CN=${userPart},CN=Users,${settings.baseDN}`;
  }
  return username.includes('@') ? username : `${username}@${settings.domain}`;
}

/**
 * Create and bind an LDAP client (accept self-signed)
 */
export async function getClient() {
  const ad = await getActiveDirectorySettings();
  const protocol = ad.protocol || 'ldap';
  const port = protocol === 'ldaps' ? 636 : 389;
  const url = `${protocol}://${ad.server}:${port}`;
  
  const client = new Client({
    url,
    tlsOptions: { rejectUnauthorized: false }
  });

  try {
    const bindDN = formatBindCredential(ad, ad.username);
    await client.bind(bindDN, ad.password);
    return client;
  } catch (err) {
    logger.api.error('LDAP bind error:', err);
    throw err;
  }
}

/**
 * Escape LDAP filter special characters
 */
export function escapeFilter(value) {
  return value.replace(/[\\()*]/g, char => `\\${char.charCodeAt(0).toString(16)}`);
}

/**
 * General LDAP search
 */
export async function search(baseDN, filter, attributes) {
  const client = await getClient();
  const opts = {
    filter,
    scope: 'sub',
    sizeLimit: 200,
    attributes: attributes.length > 0 ? attributes : ['*','+']
  };

  console.info(`LDAP search: baseDN="${baseDN}", filter="${filter}", attributes=${JSON.stringify(opts.attributes)}`);

  try {
    const { searchEntries } = await client.search(baseDN, opts);
    
    // Transform entries to maintain compatibility with the previous format
    const results = searchEntries.map(entry => {
      // Convert attributes to the format expected by the rest of the code
      const transformedEntry = {};
      
      // Process each attribute in the entry
      Object.entries(entry).forEach(([key, value]) => {
        // Skip dn as it's handled specially
        if (key !== 'dn') {
          transformedEntry[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
        }
      });
      
      return transformedEntry;
    });
    
    console.info(`LDAP search completed successfully with ${results.length} results`);
    await client.unbind();
    return results;
  } catch (err) {
    console.error('🔴 LDAP search error:', err);
    try {
      await client.unbind();
    } catch (unbindErr) {
      console.error('Error during unbind after search failure:', unbindErr);
    }
    throw err;
  }
}

/**
 * Lookup DN by employeeID
 */
export async function getDnFromEmployeeId(employeeID) {
  const ad = await getActiveDirectorySettings();
  const filter = `(&(objectClass=user)(employeeID=${employeeID}))`;
  const entries = await search(ad.baseDN, filter, ['distinguishedName']);
  return entries[0]?.distinguishedName || null;
}

/**
 * Modify an LDAP entry
 */
export async function modify(dn, changes) {
  const client = await getClient();

  try {
    // Build changes in the format expected by ldapts
    const ldapChanges = changes.flatMap(c =>
      Object.entries(c.modification).map(([attr, val]) => {
        const vals = Array.isArray(val) ? val : [val];
        return new Change({
          operation: c.operation,
          modification: new Attribute({
            type: attr,
            values: vals
          })
        });
      })
    );

    console.log('> LDAP.modify()', dn, ldapChanges);

    // Perform the modify operation
    await client.modify(dn, ldapChanges);
    
    // Unbind after successful modification
    await client.unbind();
    return;
  } catch (err) {
    console.error('🔴 LDAP.modify error:', err);
    
    // Attempt to unbind even if the modify operation failed
    try {
      await client.unbind();
    } catch (unbindErr) {
      console.error('🔴 LDAP.unbind error:', unbindErr);
      // Only throw the unbind error if it's not a connection reset
      if (unbindErr.code !== 'ECONNRESET') {
        throw unbindErr;
      }
    }
    
    // Throw the original error
    throw err;
  }
}

/**
 * Move an LDAP object to a new superior (OU)
 */
export async function moveDN(dn, newSuperior) {
  const client = await getClient();
  try {
    await client.modifyDN(dn, { newSuperior });
    await client.unbind();
  } catch (err) {
    console.error('🔴 LDAP.modifyDN error:', err);
    try {
      await client.unbind();
    } catch (unbindErr) {
      console.error('🔴 LDAP.unbind error:', unbindErr);
    }
    throw err;
  }
}
