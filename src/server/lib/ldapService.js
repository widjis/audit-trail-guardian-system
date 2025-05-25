// src/server/services/ldapService.js

import fs from 'fs';
import path from 'path';
import ldap from 'ldapjs';

import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Change, Attribute } = ldap;
/**
 * Load settings.json from server/data
 */
function loadSettings() {
  const settingsPath = path.join(__dirname, '../data/settings.json');
  if (!fs.existsSync(settingsPath)) {
    throw new Error(`settings.json not found at ${settingsPath}`);
  }
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
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
  const { activeDirectorySettings: ad } = loadSettings();
  const protocol = ad.protocol || 'ldap';
  const port = protocol === 'ldaps' ? 636 : 389;
  const url = `${protocol}://${ad.server}:${port}`;
  const client = ldap.createClient({
    url,
    reconnect: false,
    tlsOptions: { rejectUnauthorized: false }
  });

  await new Promise((resolve, reject) => {
    const bindDN = formatBindCredential(ad, ad.username);
    client.bind(bindDN, ad.password, err => err ? reject(err) : resolve());
  });

  return client;
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
      paged: { pageSize: 200, pagePause: false },   // auto-page through everything
      attributes: attributes.length > 0 ? attributes : ['*','+']
    };
  
    console.info(`LDAP search: baseDN="${baseDN}", filter="${filter}", attributes=${JSON.stringify(opts.attributes)}`);
  
    return new Promise((resolve, reject) => {
      const results = [];
  
      // catch client-level errors
      client.on('error', err => {
        console.error('🔴 LDAP client error:', err);
        client.unbind();
        reject(err);
      });
  
      client.search(baseDN, opts, (err, res) => {
        if (err) {
          client.unbind();
          return reject(err);
        }
  
        res.on('searchEntry', entry => {
          // build plain object from attributes
          const obj = entry.attributes.reduce((acc, attr) => {
            // use attr.values (array) instead of deprecated .vals
            acc[attr.type] = attr.values.length > 1 ? attr.values : attr.values[0];
            return acc;
          }, {});
          results.push(obj);
        });
  
        res.on('error', err => {
          console.error('🔴 LDAP search stream error:', err);
          client.unbind();
          reject(err);
        });
  
        res.on('end', result => {
          console.info(`LDAP search completed with status: ${result?.status}`);
          client.unbind();
          resolve(results);
        });
      });
    });
  }
  
  

/**
 * Lookup DN by employeeID
 */
export async function getDnFromEmployeeId(employeeID) {
  const { activeDirectorySettings: ad } = loadSettings();
  const filter = `(&(objectClass=user)(employeeID=${employeeID}))`;
  const entries = await search(ad.baseDN, filter, ['distinguishedName']);
  return entries[0]?.distinguishedName || null;
}

/**
 * Modify an LDAP entry
 */
export async function modify(dn, changes) {
  const client = await getClient();

  return new Promise((resolve, reject) => {
    // 1) catch any client-level errors so they don’t crash your process
    client.on('error', err => {
      console.error('🔴 LDAP client error during modify:', err);
      // if it’s just a socket-reset after unbind, swallow it
      if (err.code === 'ECONNRESET') {
        return;
      }
      client.unbind();
      reject(err);
    });

    // 2) build your Change objects as before
    const ldapChanges = changes.flatMap(c =>
      Object.entries(c.modification).map(([attr, val]) => {
        const vals = Array.isArray(val) ? val : [val];
        return new ldap.Change({
          operation:    c.operation,
          modification: new ldap.Attribute({ type: attr, vals })
        });
      })
    );

    console.log('> LDAP.modify()', dn, ldapChanges);

    // 3) invoke modify
    client.modify(dn, ldapChanges, err => {
      // unbind only once modify finishes
      client.unbind(unbindErr => {
        if (err) {
          console.error('🔴 LDAP.modify error:', err);
          return reject(err);
        }
        if (unbindErr) {
          console.error('🔴 LDAP.unbind error:', unbindErr);
          // swallow ECONNRESET from unbind
          if (unbindErr.code !== 'ECONNRESET') {
            return reject(unbindErr);
          }
        }
        resolve();
      });
    });
  });
}

/**
 * Move an LDAP object to a new superior (OU)
 */
export async function moveDN(dn, newSuperior) {
  const client = await getClient();
  return new Promise((resolve, reject) => {
    client.modifyDN(dn, { newSuperior }, err => {
      client.unbind();
      err ? reject(err) : resolve();
    });
  });
}
