
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
  loadSettings
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

export default router;
