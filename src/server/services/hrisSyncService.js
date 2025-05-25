
// server/services/hrisSyncService.js

import fs from 'fs';
import path from 'path';
import mssql from 'mssql';
import Fuse from 'fuse.js';
import { fileURLToPath } from 'url';
import {
  search as ldapSearch,
  getDnFromEmployeeId as ldapGetDn,
  modify as ldapModify,
  moveDN as ldapMoveDn
} from '../lib/ldapService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/** ─── Helpers ────────────────────────────────────────────────────────────── */

/** Load and parse settings.json */
export function loadSettings() {
  const cfg = path.join(__dirname, '../data/settings.json');
  if (!fs.existsSync(cfg)) throw new Error(`settings.json not found at ${cfg}`);
  return JSON.parse(fs.readFileSync(cfg, 'utf8'));
}

/** Validate MTI employee ID like 'MTI123456' */
function isValidEmployeeId(id) {
  return typeof id === 'string' && /^MTI\d{6}$/.test(id);
}

/** Validate Indonesian phone numbers */
function isValidPhoneNumber(num) {
  if (!num) return false;
  const cleaned = String(num).replace(/[^\d+]/g, '');
  const digits  = cleaned.replace(/^\+/, '');
  return digits.length >= 10 && digits.length <= 15 && /^(?:0|62)/.test(digits);
}

/** Standardize phone to '62...' */
function standardizePhoneNumber(num) {
  const digits = String(num).replace(/\D/g, '');
  return digits.startsWith('62') ? digits : '62' + digits.replace(/^0+/, '');
}

/**
 * Fuzzy-match an AD user by name
 * @param {Array} adUsers – list of objects with a `name` property
 * @param {string} targetName
 * @param {number} threshold – max Fuse.js score (lower = better)
 */
function fuzzyMatchAdUser(adUsers, targetName, threshold = 0.1) {
  const fuse = new Fuse(adUsers, {
    keys: ['name'],
    threshold,
    distance: 100,
    includeScore: true
  });
  const [best] = fuse.search(targetName);
  return best && best.score <= threshold ? best.item : null;
}

/**
 * Compute LDAP diffs between one DB row and one AD user
 * @returns {Object} diffs map
 */
function computeDiffs(dbRow, adUser) {
  const diffs = {};

  if (dbRow.department !== adUser.department) {
    diffs.department = dbRow.department;
    console.log(`[DIFF] Department mismatch for ${dbRow.employee_id}: DB="${dbRow.department}" AD="${adUser.department}"`);
  }
  if (dbRow.position_title !== adUser.title) {
    diffs.title = dbRow.position_title;
    console.log(`[DIFF] Title mismatch for ${dbRow.employee_id}: DB="${dbRow.position_title}" AD="${adUser.title}"`);
  }

  // if (dbRow.supervisor_id && isValidEmployeeId(dbRow.supervisor_id)) {
  //   diffs.manager = null; // placeholder—will fill below
  //   console.log(`[DIFF] Supervisor/Manager check for ${dbRow.employee_id}: DB supervisor_id="${dbRow.supervisor_id}"`);
  // }

  if (isValidPhoneNumber(dbRow.phone)) {
    const std = standardizePhoneNumber(dbRow.phone);
    if (std !== adUser.mobile) {
      diffs.mobile = std;
      console.log(`[DIFF] Mobile mismatch for ${dbRow.employee_id}: DB="${std}" AD="${adUser.mobile}"`);
    }
  }

  return diffs;
}

/** Apply the computed diffs to AD (modify + optional move) */
async function applyDiffs(adUser, diffs, adBaseDN) {
  // 1) Build only the valid change entries
  const mods = Object.entries(diffs)
    // drop any empty diffs
    .filter(([attr, val]) => attr && val != null)
    // wrap each val in an array
    .map(([attr, val]) => ({
      operation:    'replace',
      modification: { [attr]: Array.isArray(val) ? val : [val] }
    }));

  // nothing changed? skip
  if (mods.length === 0) {
    console.debug(`No valid LDAP mods for ${adUser.dn}`);
    return;
  }

  // 2) Apply the modifications
  console.log(`Applying LDAP mods to ${adUser.dn}:`, mods);
  await ldapModify(adUser.dn, mods);

  // 3) If department moved, also move the OU
  if (diffs.department) {
    const newOU = `OU=${diffs.department},${adBaseDN}`;
    console.log(`Moving ${adUser.dn} → ${newOU}`);
    await ldapMoveDn(adUser.dn, newOU);
  }
}

/**
 * Fetch HRIS rows from SQL Server
 */
export async function gatherEmployeeData() {
  const { hrisDbConfig } = loadSettings();
  if (!hrisDbConfig.enabled) throw new Error('HRIS sync disabled in settings.json');

  const pool = await mssql.connect({
    server: hrisDbConfig.server,
    port:   parseInt(hrisDbConfig.port, 10),
    database: hrisDbConfig.database,
    user:     hrisDbConfig.username,
    password: hrisDbConfig.password,
    options: { encrypt: false, trustServerCertificate: true }
  });
  const schema = hrisDbConfig.schema || 'dbo';
  const sql = `
    SELECT *
      FROM [${schema}].[it_mti_employee_database_tbl]
     WHERE grade_interval <> 'Non Staff';`;

  const { recordset } = await pool.request().query(sql);
  await pool.close();
  return recordset;
}

/**
 * Fetch and normalize AD users under a given baseDN
 */
export async function findUsersInAD(baseDN) {
  // raw check
  const raw = await ldapSearch(baseDN, '(objectClass=user)', ['dn']);
  console.info(`Raw AD entries: ${raw.length}`);

  // refined fetch
  const filter = '(&(objectClass=user)(objectCategory=user))';
  const attrs  = ['sAMAccountName','displayName','name','employeeID','department','title','manager','mobile','distinguishedName'];
  const entries = await ldapSearch(baseDN, filter, attrs);

  // map into consistent shape
  return entries.map(e => ({
    sAMAccountName: e.sAMAccountName,
    displayName:    e.displayName,
    name:           e.name,
    employeeID:     e.employeeID,
    department:     e.department,
    title:          e.title,
    manager:        e.manager,
    mobile:         e.mobile,
    dn:             e.distinguishedName
  }));
}

/**
 * Main sync function: dry-run or real apply
 */
export async function syncToActiveDirectory(testOnly = true) {
  const { activeDirectorySettings: ad } = loadSettings();
  const adBaseDN = ad.baseDN;

  const [dbUsers, adUsers] = await Promise.all([
    gatherEmployeeData(),
    findUsersInAD(adBaseDN)
  ]);

  const syncResults = [];

  for (const row of dbUsers) {
    try {
      const empId   = row.employee_id;
      const empName = row.employee_name?.trim();
      const empGender = row.gender;

      if (!empName) continue;

      // 1) Exact match
      let adUser = adUsers.find(u => u.employeeID === empId);

      // 2) Fuzzy fallback
      if (!adUser) {
        const fuzzy = fuzzyMatchAdUser(adUsers, empName);
        if (fuzzy) {
          adUser = fuzzy;
          if (!testOnly) {
            await ldapModify(fuzzy.dn, [
              { operation:'replace', modification:{ employeeID: empId } },
              { operation:'replace', modification:{ gender: empGender } }
            ]);
          }
        }
      }

      // **Guard against still‐undefined** adUser
      if (!adUser) {
        console.warn(`No AD match for ${empName}`);
        continue;
      }

      // 3) Compute diffs
      const diffs = computeDiffs(row, adUser);

      // Manager diff (outside computeDiffs for async lookup)
      if (row.supervisor_id && isValidEmployeeId(row.supervisor_id)) {
        const mgrDN = await ldapGetDn(row.supervisor_id);
        if (mgrDN && mgrDN !== adUser.manager) {
          diffs.manager = mgrDN;
        }
      }

      // 4) If no diffs, skip
      if (Object.keys(diffs).length === 0) continue;

      //5) Record result, include current values
      syncResults.push({
        employeeID: empId,
        displayName: adUser.displayName || "",
        current: {
          department: adUser.department || "",
          title:      adUser.title || "",
          manager:    adUser.manager || "",
          mobile:     adUser.mobile || ""
        },
        diffs,
        action: testOnly ? 'Test' : 'Updated'
      });

      // 6) Apply to AD if not testOnly
      if (!testOnly) {
        await applyDiffs(adUser, diffs, adBaseDN);
      }

    } catch (err) {
      console.error(`Error processing ${row.employee_id}:`, err);
    }
  }

  return { test: testOnly, results: syncResults };
}

/**
 * Sync selected users to Active Directory
 * @param {string[]} employeeIDs - Array of employee IDs to sync
 */
export async function syncSelectedUsersToAD(employeeIDs) {
  const { activeDirectorySettings: ad } = loadSettings();
  const adBaseDN = ad.baseDN;

  // Fetch all DB rows and AD users
  const [dbUsers, adUsers] = await Promise.all([
    gatherEmployeeData(),
    findUsersInAD(adBaseDN)
  ]);

  // Only process those selected
  const selectedDbUsers = dbUsers.filter(row =>
    employeeIDs.includes(row.employee_id)
  );

  const syncResults = [];

  for (const row of selectedDbUsers) {
    try {
      const empId     = row.employee_id;
      const empName   = row.employee_name?.trim();
      const empGender = row.gender;

      if (!empName) continue;

      // 1) Exact match on employeeID
      let adUser = adUsers.find(u => u.employeeID === empId);

      // 2) Fuzzy fallback: reassign employeeID & gender if needed
      if (!adUser) {
        const fuzzy = fuzzyMatchAdUser(adUsers, empName);
        if (fuzzy) {
          adUser = fuzzy;
          // record the ID reassignment in results
          syncResults.push({
            employeeID:  empId,
            displayName: adUser.displayName || '',
            current: {
              department: adUser.department || '',
              title:      adUser.title      || '',
              manager:    adUser.manager    || '',
              mobile:     adUser.mobile     || ''
            },
            diffs: {
              employeeID: empId,
              gender:     empGender
            },
            action: 'ID Reassigned'
          });
          // perform the change
          await ldapModify(adUser.dn, [
            { operation: 'replace', modification: { employeeID: [empId] } },
            { operation: 'replace', modification: { gender:     [empGender] } }
          ]);
        }
      }

      // 3) If still no match, skip
      if (!adUser) {
        console.warn(`No AD match for ${empName}`);
        continue;
      }

      // 4) Guard: ensure we have a DN before applying any diffs
      if (!adUser.dn) {
        console.warn(`Skipping ${empId}: missing DN on adUser`, adUser);
        continue;
      }

      // 5) Compute attribute diffs (department/title/mobile)
      const diffs = computeDiffs(row, adUser);

      // 6) Manager diff (async lookup)
      if (row.supervisor_id && isValidEmployeeId(row.supervisor_id)) {
        const mgrDN = await ldapGetDn(row.supervisor_id);
        if (mgrDN && mgrDN !== adUser.manager) {
          diffs.manager = mgrDN;
        }
      }

      // 7) If no diffs at all, skip
      if (Object.keys(diffs).length === 0) continue;

      // 8) Record the change
      syncResults.push({
        employeeID:  empId,
        displayName: adUser.displayName || '',
        current: {
          department: adUser.department || '',
          title:      adUser.title      || '',
          manager:    adUser.manager    || '',
          mobile:     adUser.mobile     || ''
        },
        diffs,
        action: 'Attribute Update'
      });

      // 9) Apply the diffs to AD
      await applyDiffs(adUser, diffs, adBaseDN);

    } catch (err) {
      console.error(`Error processing ${row.employee_id}:`, err);
    }
  }

  return { test: false, results: syncResults };
}

/**
 * Optional: export HRIS vs AD comparison to CSV
 */
export async function exportComparisonCsv(outputPath) {
  const cfg = loadSettings();
  const [dbUsers, adUsers] = await Promise.all([
    gatherEmployeeData(),
    findUsersInAD(cfg.activeDirectorySettings.baseDN)
  ]);

  // merge on employeeID
  const merged = dbUsers.map(d => {
    const ad = adUsers.find(u => u.employeeID === d.employee_id) || {};
    return {
      employee_id:   d.employee_id,
      employee_name: d.employee_name,
      department_db: d.department,
      department_ad: ad.department,
      title_db:      d.position_title,
      title_ad:      ad.title,
      phone_db:      d.phone,
      mobile_ad:     ad.mobile
    };
  });

  // write CSV
  const header = Object.keys(merged[0]).join(',');
  const rows   = merged.map(r => Object.values(r).map(v => `"${v||''}"`).join(','));
  fs.writeFileSync(outputPath, [header, ...rows].join('\n'));
}
