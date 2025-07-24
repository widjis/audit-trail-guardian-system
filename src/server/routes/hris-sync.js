
// server/routes/hrisSyncRoutes.js

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { format, addDays, addWeeks, addMonths, setHours, setMinutes, setSeconds } from 'date-fns';  // npm install date-fns
import {
  syncToActiveDirectory,
  syncSelectedUsersToAD,
  findUsersInAD,
  loadSettings,
  debugDataCounts,
  debugAdUserByUsername
} from '../services/hrisSyncService.js';

// ES-module __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();

// Schedule settings file path
const scheduleSettingsPath = path.join(__dirname, '../data/scheduleSettings.json');

// Helper function to load schedule settings
function loadScheduleSettings() {
  if (!fs.existsSync(scheduleSettingsPath)) {
    const defaultSettings = {
      enabled: false,
      frequency: "daily",
      lastRun: null,
      nextRun: null
    };
    fs.writeFileSync(scheduleSettingsPath, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  return JSON.parse(fs.readFileSync(scheduleSettingsPath, 'utf8'));
}

// Helper function to save schedule settings
function saveScheduleSettings(settings) {
  fs.writeFileSync(scheduleSettingsPath, JSON.stringify(settings, null, 2));
  return settings;
}

// Helper function to calculate the next run time based on frequency
function calculateNextRunTime(frequency) {
  const now = new Date();
  let nextRun;
  
  switch (frequency) {
    case 'daily':
      // Next day at midnight
      nextRun = addDays(now, 1);
      nextRun = setHours(nextRun, 0);
      nextRun = setMinutes(nextRun, 0);
      nextRun = setSeconds(nextRun, 0);
      break;
    case 'weekly':
      // Next Sunday at midnight
      nextRun = addWeeks(now, 1);
      // Set to Sunday (0)
      while (nextRun.getDay() !== 0) {
        nextRun = addDays(nextRun, 1);
      }
      nextRun = setHours(nextRun, 0);
      nextRun = setMinutes(nextRun, 0);
      nextRun = setSeconds(nextRun, 0);
      break;
    case 'monthly':
      // 1st of next month at midnight
      nextRun = addMonths(now, 1);
      nextRun.setDate(1);
      nextRun = setHours(nextRun, 0);
      nextRun = setMinutes(nextRun, 0);
      nextRun = setSeconds(nextRun, 0);
      break;
    default:
      // Default to daily
      nextRun = addDays(now, 1);
      nextRun = setHours(nextRun, 0);
      nextRun = setMinutes(nextRun, 0);
      nextRun = setSeconds(nextRun, 0);
  }
  
  return nextRun;
}

/**
 * Safely quote any CSV field.
 */
function quoteField(val) {
  if (val == null) return '""';
  const s = String(val);
  // Escape existing quotes by doubling them
  const escaped = s.replace(/"/g, '""');
  // Wrap the whole thing in quotes
  return `"${escaped}"`;
}

/**
 * Convert the sync results into a CSV string.
 */
function resultsToCsv(results, testOnly) {
  const header = [
    'EmployeeID',
    'DisplayName',
    'Department (Current)', 'Department (New)',
    'Title (Current)',      'Title (New)',
    'Manager (Current)',    'Manager (New)',
    'Mobile (Current)',     'Mobile (New)',
    'Action'
  ].join(',');

  const lines = [header];

  for (const r of results) {
    // const row = [
    //   r.employeeID,
    //   r.displayName,
    //   r.current.department || '',
    //   r.diffs.department     || '',
    //   r.current.title        || '',
    //   r.diffs.title          || '',
    //   r.current.manager      || '',
    //   r.diffs.manager        || '',
    //   r.current.mobile       || '',
    //   r.diffs.mobile         || '',
    //   r.action
    // ];
    // blank out unchanged columns
    const deptCurrent = r.diffs.department != null ? r.current.department : '';
    const deptNew     = r.diffs.department != null ? r.diffs.department  : '';

    const titleCurrent = r.diffs.title != null ? r.current.title : '';
    const titleNew     = r.diffs.title != null ? r.diffs.title    : '';

    const mgrCurrent = r.diffs.manager != null ? r.current.manager : '';
    const mgrNew     = r.diffs.manager != null ? r.diffs.manager    : '';

    const mobCurrent = r.diffs.mobile != null ? r.current.mobile : '';
    const mobNew     = r.diffs.mobile != null ? r.diffs.mobile    : '';

    const row = [
      r.employeeID,
      r.displayName,
      deptCurrent, deptNew,
      titleCurrent, titleNew,
      mgrCurrent,   mgrNew,
      mobCurrent,   mobNew,
      r.action
    ];

    lines.push(row.map(quoteField).join(','));
  }

  return lines.join('\r\n');
}

/**
 * GET /api/hris-sync/test
 * Runs a dry-run sync and returns the results as JSON.
 */
router.get('/test', async (req, res) => {
  try {
    // 1) Run dry-run sync
    const { test, results } = await syncToActiveDirectory(true);

    // 2) Return results as JSON
    res.json({ success: true, test, results });
  } catch (err) {
    console.error('[HRIS] /test error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/hris-sync/manual
 * Syncs only selected users from the employeeIDs array
 */
router.post('/manual', async (req, res) => {
  try {
    const { employeeIDs } = req.body;
    
    if (!employeeIDs || !Array.isArray(employeeIDs) || employeeIDs.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request: employeeIDs array required' 
      });
    }
    
    const { test, results } = await syncSelectedUsersToAD(employeeIDs);
    res.json({ success: true, test, results });
  } catch (err) {
    console.error('[HRIS] /manual sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/hris-sync/
 * Runs a real sync (writes to AD) and returns JSON details of applied changes.
 */
router.post('/', async (req, res) => {
  try {
    const { test, results } = await syncToActiveDirectory(false);
    res.json({ success: true, test, results });
  } catch (err) {
    console.error('[HRIS] / sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hris-sync/schedule
 * Gets the current schedule settings
 */
router.get('/schedule', (req, res) => {
  try {
    const settings = loadScheduleSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[HRIS] /schedule error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/hris-sync/schedule
 * Updates schedule settings
 */
router.post('/schedule', (req, res) => {
  try {
    const { enabled, frequency } = req.body;
    const settings = loadScheduleSettings();
    
    settings.enabled = enabled;
    if (frequency) {
      settings.frequency = frequency;
    }
    
    // Calculate next run time if enabled
    if (enabled) {
      settings.nextRun = calculateNextRunTime(settings.frequency).toISOString();
    } else {
      settings.nextRun = null;
    }
    
    saveScheduleSettings(settings);
    
    res.json({ 
      success: true, 
      settings,
      nextRun: settings.nextRun
    });
  } catch (err) {
    console.error('[HRIS] /schedule update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hris-sync/query
 * Returns all AD users under the configured baseDN as JSON.
 */
router.get('/query', async (req, res) => {
  try {
    const { activeDirectorySettings: ad } = loadSettings();
    const users = await findUsersInAD(ad.baseDN);
    res.json({
      success: true,
      baseDN: ad.baseDN,
      count: users.length,
      users
    });
  } catch (err) {
    console.error('[HRIS] /query error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hris-sync/debug-counts
 * Debug endpoint for raw data counts
 */
router.get('/debug-counts', async (req, res) => {
  try {
    const { gatherEmployeeData, findUsersInAD, loadSettings } = await import('../services/hrisSyncService.js');
    const settings = loadSettings();
    
    // Get raw counts
    const dbUsers = await gatherEmployeeData();
    const adUsers = await findUsersInAD(settings.activeDirectorySettings.baseDN);
    
    // Get database connection for additional queries
    const dbPool = req.app.locals.dbPool;
    const SystemConfigService = (await import('../services/system-config-service.js')).default;
    const systemConfig = new SystemConfigService(dbPool);
    const hrisDbConfig = await systemConfig.getHrisConfig();
    
    // Check total employees in database (including Non Staff)
    const mssql = (await import('mssql')).default;
    const pool = await mssql.connect({
      server: hrisDbConfig.server,
      port: parseInt(hrisDbConfig.port, 10),
      database: hrisDbConfig.database,
      user: hrisDbConfig.username,
      password: hrisDbConfig.password,
      options: { encrypt: false, trustServerCertificate: true }
    });
    
    const schema = hrisDbConfig.schema || 'dbo';
    
    // Total employees
    const totalResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM [${schema}].[it_mti_employee_database_tbl]
    `);
    
    // Non-staff count
    const nonStaffResult = await pool.request().query(`
      SELECT COUNT(*) as nonStaff FROM [${schema}].[it_mti_employee_database_tbl] 
      WHERE grade_interval = 'Non Staff'
    `);
    
    // Staff count (what we're actually processing)
    const staffResult = await pool.request().query(`
      SELECT COUNT(*) as staff FROM [${schema}].[it_mti_employee_database_tbl] 
      WHERE grade_interval <> 'Non Staff'
    `);
    
    // Grade intervals breakdown
    const gradeBreakdown = await pool.request().query(`
      SELECT grade_interval, COUNT(*) as count 
      FROM [${schema}].[it_mti_employee_database_tbl] 
      GROUP BY grade_interval 
      ORDER BY count DESC
    `);
    
    await pool.close();
    
    res.json({
      success: true,
      data: {
        database: {
          totalEmployees: totalResult.recordset[0].total,
          nonStaffEmployees: nonStaffResult.recordset[0].nonStaff,
          staffEmployees: staffResult.recordset[0].staff,
          processedBySync: dbUsers.length,
          gradeBreakdown: gradeBreakdown.recordset
        },
        activeDirectory: {
          totalUsers: adUsers.length,
          usersWithEmployeeID: adUsers.filter(u => u.employeeID).length,
          usersWithoutEmployeeID: adUsers.filter(u => !u.employeeID).length
        },
        matching: {
          exactMatches: dbUsers.filter(db => 
            adUsers.some(ad => ad.employeeID === db.employee_id)
          ).length,
          potentialFuzzyMatches: dbUsers.filter(db => 
            !adUsers.some(ad => ad.employeeID === db.employee_id) &&
            adUsers.some(ad => ad.displayName && ad.displayName.toLowerCase().includes(db.employee_name?.toLowerCase() || ''))
          ).length
        }
      }
    });
  } catch (error) {
    console.error('Debug counts error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});

/**
 * GET /api/hris-sync/debug/:employeeId
 * Debug specific employee sync process
 */
router.get('/debug/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { debugEmployeeSync } = await import('../services/hrisSyncService.js');
    
    const debugInfo = await debugEmployeeSync(employeeId);
    res.json({ success: true, debug: debugInfo });
  } catch (err) {
    console.error(`[HRIS] /debug/${req.params.employeeId} error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Debug endpoint for data counts analysis
router.get('/debug-counts', async (req, res) => {
  try {
    console.log('[API] Debug counts endpoint called');
    const data = await debugDataCounts();
    res.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Debug counts error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check AD user by username
router.get('/debug-ad-user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const data = await debugAdUserByUsername(username);
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug-ad-user endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
