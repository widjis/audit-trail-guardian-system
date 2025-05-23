// server/services/hrisSyncService.js

import fs from 'fs';
import path from 'path';
import mssql from 'mssql';
import { fileURLToPath } from 'url';
import {
  search as ldapSearch,
  getDnFromEmployeeId as ldapGetDn,
  modify as ldapModify,
  moveDN as ldapMoveDn
} from '../lib/ldapService.js';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load settings.json from server/data
 */
export function loadSettings() {
  const settingsPath = path.join(__dirname, '../data/settings.json');
  console.log(`[HRIS] Loading settings from: ${settingsPath}`);
  if (!fs.existsSync(settingsPath)) {
    console.error(`[HRIS] settings.json not found at ${settingsPath}`);
    throw new Error(`settings.json not found at ${settingsPath}`);
  }
  console.log(`[HRIS] settings.json loaded successfully.`);
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

/** Validate MTI employee ID like 'MTI123456' */
function isValidEmployeeId(id) {
  return typeof id === 'string' && /^MTI\d{6}$/.test(id);
}

/** Validate Indonesian phone numbers */
function isValidPhoneNumber(num) {
  if (!num) return false;
  const cleaned = String(num).replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/^\+/, '');
  return digits.length >= 10 && digits.length <= 15 && /^(?:0|62)/.test(digits);
}

/** Standardize phone to '62...' */
function standardizePhoneNumber(num) {
  const digits = String(num).replace(/[^\d]/g, '');
  return digits.startsWith('62') ? digits : '62' + digits.replace(/^0+/, '');
}

/**
 * Fetch HRIS employee data from SQL Server
 */
export async function gatherEmployeeData() {
  const { hrisDbConfig: hris } = loadSettings();
  console.log(`[HRIS] HRIS DB Config:`, hris);
  if (!hris.enabled) {
    console.warn('[HRIS] HRIS sync is disabled in settings.json');
    throw new Error('HRIS sync is disabled in settings.json');
  }

  console.log(`[HRIS] Connecting to SQL Server: ${hris.server}:${hris.port}, DB: ${hris.database}`);
  let pool;
  try {
    pool = await mssql.connect({
      server: hris.server,
      port: parseInt(hris.port, 10),
      database: hris.database,
      user: hris.username,
      password: hris.password,
      options: { encrypt: false, trustServerCertificate: true }
    });
    console.log('[HRIS] SQL Server connection established.');
  } catch (err) {
    console.error('[HRIS] Failed to connect to SQL Server:', err);
    throw err;
  }

  const schema = hris.schema || 'dbo';
  const sql = `
    SELECT *
      FROM [${schema}].[it_mti_employee_database_tbl]
     WHERE grade_interval <> 'Non Staff'
  `;
  console.log(`[HRIS] Executing SQL: ${sql}`);
  let result;
  try {
    result = await pool.request().query(sql);
    console.log(`[HRIS] Query successful. Rows fetched: ${result.recordset.length}`);
  } catch (err) {
    console.error('[HRIS] SQL query failed:', err);
    throw err;
  } finally {
    await pool.close();
    console.log('[HRIS] SQL Server connection closed.');
  }
  return result.recordset;
}

/**
 * Fetch users from Active Directory
 */
export async function findUsersInAD(baseDN) {
  const settings = loadSettings();
  console.log(`[HRIS] LDAP RAW dump — searching under baseDN: ${baseDN}`);

  // Broad filter to fetch any user objects
  const rawEntries = await ldapSearch(baseDN, '(objectClass=user)', []);
  console.log('[HRIS] Sample raw LDAP entries:', rawEntries.slice(0, 5));
  console.log(`[HRIS] Total raw LDAP entries returned: ${rawEntries.length}`);

  // Now refine with specific filter and attributes
  const filter = '(&(objectClass=user)(objectCategory=user))';
  const attrs = ['sAMAccountName','displayName','employeeID','department','title','manager','mobile','distinguishedName'];
  const entries = await ldapSearch(baseDN, filter, attrs);

  console.log(`[HRIS] Refined LDAP entries found: ${entries.length}`);
  entries.slice(0,5).forEach((o,i) => {
    console.log(`[HRIS] Entry ${i+1}:`, 'keys=', Object.keys(o));
  });

  return entries.map(o => ({
    sAMAccountName: o.sAMAccountName,
    displayName:    o.displayName,
    employeeID:     o.employeeID,
    department:     o.department,
    title:          o.title,
    manager:        o.manager,
    mobile:         o.mobile,
    dn:             o.distinguishedName
  }));
}

/**
 * Sync HRIS data into Active Directory
 */
export async function syncToActiveDirectory(testOnly = true) {
  const { activeDirectorySettings: ad } = loadSettings();
  console.log(`[HRIS] Starting sync. testOnly=${testOnly}`);

  const [dbUsers, adUsers] = await Promise.all([
    gatherEmployeeData(),
    findUsersInAD(ad.baseDN)
  ]);
  console.log(`[HRIS] Fetched ${dbUsers.length} DB users and ${adUsers.length} AD users.`);

  const results = [];
  for (const row of dbUsers) {
    const empId = row.employee_id;
    if (!isValidEmployeeId(empId)) continue;

    const match = adUsers.find(u => u.employeeID === empId);
    if (!match) continue;

    const wantedMgr = row.supervisor_id && isValidEmployeeId(row.supervisor_id)
      ? await ldapGetDn(row.supervisor_id)
      : null;

    const diffs = {};
    if (row.department !== match.department) diffs.department = row.department;
    if (row.position_title !== match.title)   diffs.title      = row.position_title;
    if (wantedMgr && wantedMgr !== match.manager) diffs.manager = wantedMgr;
    if (isValidPhoneNumber(row.phone)) {
      const stdPhone = standardizePhoneNumber(row.phone);
      if (stdPhone !== match.mobile) diffs.mobile = stdPhone;
    }

    if (Object.keys(diffs).length) {
      results.push({ employeeID: empId, displayName: match.displayName, diffs });
      if (!testOnly) {
        const mods = Object.entries(diffs).map(([attr,val]) => ({ operation:'replace', modification:{ [attr]: val } }));
        await ldapModify(match.dn, mods);
        if (diffs.department) {
          const newParent = `OU=${diffs.department},${ad.baseDN}`;
          await ldapMoveDn(match.dn, newParent);
        }
      }
    }
  }

  console.log(`[HRIS] Sync complete. ${results.length} changes.`);
  return { test: testOnly, results };
}
