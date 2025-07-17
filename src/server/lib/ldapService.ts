// src/server/lib/ldapService.ts

import { Client, SearchOptions } from 'ldapts';
import type { Change } from 'ldapts';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import SystemConfigService from '../services/system-config-service.js';
import { getDbPool } from '../utils/dbConnection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize system config service with lazy loading
let systemConfigService: SystemConfigService | null = null;

const getSystemConfigService = (): SystemConfigService | null => {
  if (!systemConfigService) {
    const dbPool = getDbPool();
    if (dbPool) {
      systemConfigService = new SystemConfigService(dbPool);
    }
  }
  return systemConfigService;
};

/**
 * Interface for Active Directory settings
 */
interface ActiveDirectorySettings {
  server: string;
  port?: number;
  protocol?: 'ldap' | 'ldaps';
  username: string;
  password: string;
  baseDN: string;
  domain: string;
  authFormat?: 'dn' | 'upn';
}

/**
 * Interface for LDAP modification
 */
interface LdapModification {
  operation: 'add' | 'delete' | 'replace';
  modification: Record<string, string | string[]>;
}

/**
 * Get Active Directory settings from database
 */
async function getActiveDirectorySettings(): Promise<ActiveDirectorySettings> {
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
function formatBindCredential(settings: ActiveDirectorySettings, username: string): string {
  if (username.startsWith('CN=')) return username;
  if (settings.authFormat === 'dn') {
    const userPart = username.includes('@') ? username.split('@')[0] : username;
    return `CN=${userPart},CN=Users,${settings.baseDN}`;
  }
  return username.includes('@') ? username : `${username}@${settings.domain}`;
}

/**
 * Create and bind an LDAP client using ldapts
 */
export async function getClient(): Promise<Client> {
  const ad = await getActiveDirectorySettings();
  const protocol = ad.protocol || 'ldap';
  const port = protocol === 'ldaps' ? 636 : 389;
  const url = `${protocol}://${ad.server}:${port}`;
  
  const client = new Client({
    url,
    timeout: 10000,
    connectTimeout: 15000,
    tlsOptions: { 
      rejectUnauthorized: false,
      requestCert: true,
      ciphers: 'ALL',
      secureProtocol: 'TLSv1_2_method'
    }
  });

  try {
    const bindDN = formatBindCredential(ad, ad.username);
    await client.bind(bindDN, ad.password);
    return client;
  } catch (error) {
    await client.unbind();
    throw error;
  }
}

/**
 * Escape LDAP filter special characters
 */
export function escapeFilter(value: string): string {
  return value.replace(/[\\()*]/g, char => `\\${char.charCodeAt(0).toString(16)}`);
}

/**
 * General LDAP search using ldapts
 */
export async function search(
  baseDN: string, 
  filter: string, 
  attributes: string[] = []
): Promise<Record<string, any>[]> {
  const client = await getClient();
  
  try {
    const searchOptions: SearchOptions = {
      filter,
      scope: 'sub',
      paged: { pageSize: 200 },
      attributes: attributes.length > 0 ? attributes : ['*', '+']
    };
    
    console.info(`LDAP search: baseDN="${baseDN}", filter="${filter}", attributes=${JSON.stringify(searchOptions.attributes)}`);
    
    const { searchEntries } = await client.search(baseDN, searchOptions);
    
    // Transform entries to match the old format
    const results = searchEntries.map(entry => {
      const obj: Record<string, any> = {};
      Object.entries(entry).forEach(([key, value]) => {
        if (key !== 'dn') {
          // Match old behavior: single values are not arrays, multiple values are arrays
          obj[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
        }
      });
      return obj;
    });
    
    console.info(`LDAP search completed with ${results.length} results`);
    return results;
  } finally {
    await client.unbind();
  }
}

/**
 * Lookup DN by employeeID
 */
export async function getDnFromEmployeeId(employeeID: string): Promise<string | null> {
  const ad = await getActiveDirectorySettings();
  const filter = `(&(objectClass=user)(employeeID=${employeeID}))`;
  const entries = await search(ad.baseDN, filter, ['distinguishedName']);
  return entries[0]?.distinguishedName || null;
}

/**
 * Modify an LDAP entry using ldapts
 */
export async function modify(dn: string, changes: LdapModification[]): Promise<void> {
  const client = await getClient();
  
  try {
    // Transform changes to ldapts format
    const ldapChanges: any[] = changes.flatMap(c =>
      Object.entries(c.modification).map(([attribute, values]) => ({
        operation: c.operation,
        modification: {
          [attribute]: Array.isArray(values) ? values : [values]
        }
      }))
    );
    
    console.log('> LDAP.modify()', dn, ldapChanges);
    
    await client.modify(dn, ldapChanges);
  } finally {
    await client.unbind();
  }
}

/**
 * Move an LDAP object to a new superior (OU)
 */
export async function moveDN(dn: string, newSuperior: string): Promise<void> {
  const client = await getClient();
  
  try {
    // Extract the RDN (relative distinguished name) from the full DN
    const rdn = dn.split(',')[0];
    // Construct the new DN with the new superior
    const newDN = `${rdn},${newSuperior}`;
    // modifyDN signature in ldapts: (dn, newDN, controls?)
    await client.modifyDN(dn, newDN);
  } finally {
    await client.unbind();
  }
}