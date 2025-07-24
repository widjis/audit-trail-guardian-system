
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
import SystemConfigService from './system-config-service.js';
import { getDbPool } from '../utils/dbConnection.js';

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
  const dbPool = getDbPool();
  const systemConfig = new SystemConfigService(dbPool);
  const hrisDbConfig = await systemConfig.getHrisConfig();
  
  if (!hrisDbConfig.enabled) throw new Error('HRIS sync disabled in configuration');

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
  const dbPool = getDbPool();
  const systemConfig = new SystemConfigService(dbPool);
  const ad = await systemConfig.getActiveDirectoryConfig();
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
  const dbPool = getDbPool();
  const systemConfig = new SystemConfigService(dbPool);
  const ad = await systemConfig.getActiveDirectoryConfig();
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
 * Debug specific employee sync process
 * @param {string} employeeId - Employee ID to debug
 * @returns {Promise<Object>} Debug information
 */
export async function debugEmployeeSync(employeeId) {
  const dbPool = getDbPool();
  const systemConfig = new SystemConfigService(dbPool);
  const ad = await systemConfig.getActiveDirectoryConfig();
  const adBaseDN = ad.baseDN;

  console.log(`[DEBUG] Starting debug for employee: ${employeeId}`);

  // Fetch all data
  const [dbUsers, adUsers] = await Promise.all([
    gatherEmployeeData(),
    findUsersInAD(adBaseDN)
  ]);

  // Find the specific employee in HRIS
  const dbUser = dbUsers.find(row => row.employee_id === employeeId);
  if (!dbUser) {
    return {
      employeeId,
      found: false,
      error: 'Employee not found in HRIS database',
      hrisData: null,
      adData: null,
      matchingProcess: null,
      diffs: null
    };
  }

  console.log(`[DEBUG] Found in HRIS:`, {
    employee_id: dbUser.employee_id,
    employee_name: dbUser.employee_name,
    department: dbUser.department,
    position_title: dbUser.position_title,
    supervisor_id: dbUser.supervisor_id,
    phone: dbUser.phone,
    gender: dbUser.gender
  });

  const empName = dbUser.employee_name?.trim();
  if (!empName) {
    return {
      employeeId,
      found: true,
      error: 'Employee name is empty in HRIS',
      hrisData: dbUser,
      adData: null,
      matchingProcess: { step: 'name_validation', result: 'failed' },
      diffs: null
    };
  }

  // Try exact match first
  let adUser = adUsers.find(u => u.employeeID === employeeId);
  let matchingProcess = {
    exactMatch: {
      attempted: true,
      found: !!adUser,
      result: adUser || null
    }
  };

  // Try fuzzy match if exact match failed
  if (!adUser) {
    console.log(`[DEBUG] No exact match found, trying fuzzy match for: ${empName}`);
    const fuzzy = fuzzyMatchAdUser(adUsers, empName);
    matchingProcess.fuzzyMatch = {
      attempted: true,
      found: !!fuzzy,
      result: fuzzy || null,
      threshold: 0.1
    };
    
    if (fuzzy) {
      adUser = fuzzy;
      console.log(`[DEBUG] Fuzzy match found:`, {
        displayName: adUser.displayName,
        employeeID: adUser.employeeID,
        department: adUser.department,
        title: adUser.title,
        manager: adUser.manager,
        mobile: adUser.mobile
      });
    }
  } else {
    console.log(`[DEBUG] Exact match found:`, {
      displayName: adUser.displayName,
      employeeID: adUser.employeeID,
      department: adUser.department,
      title: adUser.title,
      manager: adUser.manager,
      mobile: adUser.mobile
    });
  }

  if (!adUser) {
    return {
      employeeId,
      found: true,
      error: 'No matching user found in Active Directory',
      hrisData: dbUser,
      adData: null,
      matchingProcess,
      diffs: null
    };
  }

  // Compute diffs
  const diffs = computeDiffs(dbUser, adUser);
  console.log(`[DEBUG] Initial diffs computed:`, diffs);

  // Check manager diff separately
  let managerDiff = null;
  if (dbUser.supervisor_id && isValidEmployeeId(dbUser.supervisor_id)) {
    console.log(`[DEBUG] Checking manager for supervisor_id: ${dbUser.supervisor_id}`);
    try {
      const mgrDN = await ldapGetDn(dbUser.supervisor_id);
      console.log(`[DEBUG] Manager DN lookup result: ${mgrDN}`);
      console.log(`[DEBUG] Current AD manager: ${adUser.manager}`);
      
      if (mgrDN && mgrDN !== adUser.manager) {
        diffs.manager = mgrDN;
        managerDiff = {
          supervisorId: dbUser.supervisor_id,
          expectedManagerDN: mgrDN,
          currentManagerDN: adUser.manager,
          willUpdate: true
        };
      } else {
        managerDiff = {
          supervisorId: dbUser.supervisor_id,
          expectedManagerDN: mgrDN,
          currentManagerDN: adUser.manager,
          willUpdate: false,
          reason: mgrDN ? 'Manager DN matches current' : 'Manager DN not found in AD'
        };
      }
    } catch (err) {
      console.error(`[DEBUG] Error looking up manager DN:`, err);
      managerDiff = {
        supervisorId: dbUser.supervisor_id,
        error: err.message
      };
    }
  } else {
    managerDiff = {
      supervisorId: dbUser.supervisor_id,
      reason: dbUser.supervisor_id ? 'Invalid employee ID format' : 'No supervisor ID in HRIS'
    };
  }

  const finalDiffs = { ...diffs };
  const totalDiffs = Object.keys(finalDiffs).length;
  
  console.log(`[DEBUG] Final diffs:`, finalDiffs);
  console.log(`[DEBUG] Total differences found: ${totalDiffs}`);

  return {
    employeeId,
    found: true,
    hrisData: {
      employee_id: dbUser.employee_id,
      employee_name: dbUser.employee_name,
      department: dbUser.department,
      position_title: dbUser.position_title,
      supervisor_id: dbUser.supervisor_id,
      phone: dbUser.phone,
      gender: dbUser.gender
    },
    adData: {
      displayName: adUser.displayName,
      employeeID: adUser.employeeID,
      department: adUser.department,
      title: adUser.title,
      manager: adUser.manager,
      mobile: adUser.mobile,
      dn: adUser.dn
    },
    matchingProcess,
    diffs: finalDiffs,
    managerAnalysis: managerDiff,
    syncDecision: {
      willSync: totalDiffs > 0,
      reason: totalDiffs > 0 ? `${totalDiffs} differences found` : 'No differences found - user will be skipped',
      differencesCount: totalDiffs
    }
  };
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

/**
 * Debug function to analyze data counts and matching statistics
 */
export async function debugDataCounts() {
  console.log('[DEBUG] Starting data counts analysis...');
  
  try {
    const dbPool = getDbPool();
    const systemConfig = new SystemConfigService(dbPool);
    const hrisDbConfig = await systemConfig.getHrisConfig();
    const adConfig = await systemConfig.getActiveDirectoryConfig();
    
    if (!hrisDbConfig.enabled) {
      throw new Error('HRIS sync disabled in configuration');
    }

    // Connect to HRIS database
    const pool = await mssql.connect({
      server: hrisDbConfig.server,
      port: parseInt(hrisDbConfig.port, 10),
      database: hrisDbConfig.database,
      user: hrisDbConfig.username,
      password: hrisDbConfig.password,
      options: { encrypt: false, trustServerCertificate: true }
    });
    
    const schema = hrisDbConfig.schema || 'dbo';
    
    // Get database statistics
    console.log('[DEBUG] Fetching database statistics...');
    
    // Total employees
    const totalResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM [${schema}].[it_mti_employee_database_tbl]
    `);
    const totalEmployees = totalResult.recordset[0].count;
    
    // Non-staff employees
    const nonStaffResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM [${schema}].[it_mti_employee_database_tbl] 
      WHERE grade_interval = 'Non Staff'
    `);
    const nonStaffEmployees = nonStaffResult.recordset[0].count;
    
    // Staff employees (processed by sync)
    const staffResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM [${schema}].[it_mti_employee_database_tbl] 
      WHERE grade_interval <> 'Non Staff'
    `);
    const staffEmployees = staffResult.recordset[0].count;
    
    // Employees with valid names (actually processed)
    const validNamesResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM [${schema}].[it_mti_employee_database_tbl] 
      WHERE grade_interval <> 'Non Staff' 
      AND employee_name IS NOT NULL 
      AND LTRIM(RTRIM(employee_name)) <> ''
    `);
    const processedBySync = validNamesResult.recordset[0].count;
    
    // Grade breakdown
    const gradeResult = await pool.request().query(`
      SELECT grade_interval, COUNT(*) as count 
      FROM [${schema}].[it_mti_employee_database_tbl] 
      GROUP BY grade_interval 
      ORDER BY count DESC
    `);
    const gradeBreakdown = gradeResult.recordset;
    
    await pool.close();
    
    // Get Active Directory statistics
    console.log('[DEBUG] Fetching Active Directory statistics...');
    const adUsers = await findUsersInAD(adConfig.baseDN);
    
    const totalAdUsers = adUsers.length;
    const usersWithEmployeeID = adUsers.filter(u => u.employeeID && isValidEmployeeId(u.employeeID)).length;
    const usersWithoutEmployeeID = totalAdUsers - usersWithEmployeeID;
    
    // Get matching statistics
    console.log('[DEBUG] Analyzing matching statistics...');
    const dbUsers = await gatherEmployeeData();
    
    let exactMatches = 0;
    let potentialFuzzyMatches = 0;
    
    for (const dbUser of dbUsers) {
      if (!dbUser.employee_name?.trim()) continue;
      
      // Check exact match
      const exactMatch = adUsers.find(u => u.employeeID === dbUser.employee_id);
      if (exactMatch) {
        exactMatches++;
      } else {
        // Check fuzzy match potential
        const fuzzyMatch = fuzzyMatchAdUser(adUsers, dbUser.employee_name.trim());
        if (fuzzyMatch) {
          potentialFuzzyMatches++;
        }
      }
    }
    
    console.log('[DEBUG] Data counts analysis completed');
    
    return {
      database: {
        totalEmployees,
        nonStaffEmployees,
        staffEmployees,
        processedBySync,
        gradeBreakdown
      },
      activeDirectory: {
        totalUsers: totalAdUsers,
        usersWithEmployeeID,
        usersWithoutEmployeeID
      },
      matching: {
        exactMatches,
        potentialFuzzyMatches
      }
    };
    
  } catch (error) {
    console.error('[DEBUG] Error in debugDataCounts:', error);
    throw error;
  }
}

/**
 * Debug function to check AD user details by username
 */
export async function debugAdUserByUsername(username) {
  console.log(`[DEBUG] Checking AD user details for username: ${username}`);
  
  try {
    const dbPool = getDbPool();
    const systemConfig = new SystemConfigService(dbPool);
    const adConfig = await systemConfig.getActiveDirectoryConfig();
    
    // Search for user by multiple attributes
    const searchFilters = [
      `(&(objectClass=user)(sAMAccountName=${username}))`,
      `(&(objectClass=user)(userPrincipalName=${username}))`,
      `(&(objectClass=user)(userPrincipalName=${username}@*))`,
      `(&(objectClass=user)(mail=${username}))`,
      `(&(objectClass=user)(mail=${username}@*))`
    ];
    
    const attributes = [
      'sAMAccountName', 'userPrincipalName', 'displayName', 'name', 
      'employeeID', 'department', 'title', 'manager', 'mobile', 
      'mail', 'distinguishedName', 'objectClass', 'cn'
    ];
    
    let foundUser = null;
    let searchMethod = null;
    
    // Try each search filter until we find the user
    for (let i = 0; i < searchFilters.length; i++) {
      const filter = searchFilters[i];
      console.log(`[DEBUG] Trying search filter: ${filter}`);
      
      try {
        const results = await ldapSearch(adConfig.baseDN, filter, attributes);
        if (results && results.length > 0) {
          foundUser = results[0];
          searchMethod = filter;
          console.log(`[DEBUG] User found with filter: ${filter}`);
          break;
        }
      } catch (searchError) {
        console.log(`[DEBUG] Search failed with filter ${filter}:`, searchError.message);
      }
    }
    
    if (!foundUser) {
      return {
        username,
        found: false,
        searchMethods: searchFilters,
        message: 'User not found in Active Directory with any of the search methods'
      };
    }
    
    // Check if this user has an employeeID and if it matches any HRIS employee
    const dbUsers = await gatherEmployeeData();
    let matchingHrisEmployee = null;
    
    if (foundUser.employeeID) {
      matchingHrisEmployee = dbUsers.find(emp => emp.employee_id === foundUser.employeeID);
    }
    
    // Also check for fuzzy name matches
    let fuzzyMatches = [];
    if (foundUser.displayName || foundUser.name) {
      const searchName = foundUser.displayName || foundUser.name;
      fuzzyMatches = dbUsers.filter(emp => {
        if (!emp.employee_name) return false;
        const similarity = calculateSimilarity(searchName.toLowerCase(), emp.employee_name.toLowerCase());
        return similarity > 0.7; // 70% similarity threshold
      }).map(emp => ({
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        similarity: calculateSimilarity(searchName.toLowerCase(), emp.employee_name.toLowerCase())
      })).sort((a, b) => b.similarity - a.similarity);
    }
    
    return {
      username,
      found: true,
      searchMethod,
      adUserDetails: {
        sAMAccountName: foundUser.sAMAccountName,
        userPrincipalName: foundUser.userPrincipalName,
        displayName: foundUser.displayName,
        name: foundUser.name,
        employeeID: foundUser.employeeID,
        department: foundUser.department,
        title: foundUser.title,
        manager: foundUser.manager,
        mobile: foundUser.mobile,
        mail: foundUser.mail,
        distinguishedName: foundUser.distinguishedName,
        cn: foundUser.cn
      },
      hrisMatching: {
        exactMatch: matchingHrisEmployee ? {
          employee_id: matchingHrisEmployee.employee_id,
          employee_name: matchingHrisEmployee.employee_name,
          department: matchingHrisEmployee.department,
          position_title: matchingHrisEmployee.position_title
        } : null,
        fuzzyMatches: fuzzyMatches.slice(0, 5) // Top 5 fuzzy matches
      },
      analysis: {
        hasEmployeeID: !!foundUser.employeeID,
        employeeIDValue: foundUser.employeeID || 'Not set',
        hasExactHrisMatch: !!matchingHrisEmployee,
        hasFuzzyMatches: fuzzyMatches.length > 0,
        recommendations: generateRecommendations(foundUser, matchingHrisEmployee, fuzzyMatches)
      }
    };
    
  } catch (error) {
    console.error(`[DEBUG] Error in debugAdUserByUsername for ${username}:`, error);
    throw error;
  }
}

/**
 * Generate recommendations based on AD user analysis
 */
function generateRecommendations(adUser, exactMatch, fuzzyMatches) {
  const recommendations = [];
  
  if (!adUser.employeeID) {
    recommendations.push({
      type: 'missing_employee_id',
      message: 'User does not have an employeeID set in Active Directory',
      action: 'Set the employeeID attribute in AD to enable HRIS sync matching'
    });
  } else if (!exactMatch) {
    recommendations.push({
      type: 'employee_id_mismatch',
      message: `User has employeeID "${adUser.employeeID}" but no matching HRIS employee found`,
      action: 'Verify the employeeID value matches an employee in the HRIS database'
    });
  }
  
  if (fuzzyMatches.length > 0 && !exactMatch) {
    recommendations.push({
      type: 'potential_fuzzy_match',
      message: `Found ${fuzzyMatches.length} potential name matches in HRIS`,
      action: `Consider setting employeeID to one of: ${fuzzyMatches.slice(0, 3).map(m => m.employee_id).join(', ')}`
    });
  }
  
  if (!adUser.department) {
    recommendations.push({
      type: 'missing_department',
      message: 'User does not have a department set in Active Directory',
      action: 'Set the department attribute for proper organizational structure'
    });
  }
  
  return recommendations;
}
