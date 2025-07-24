
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
  debugDataCounts,
  debugAdUserByUsername,
  gatherEmployeeData
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
    // Extract confidence threshold from query parameters
    const confidenceThreshold = parseFloat(req.query.confidenceThreshold) || 0.4;
    
    // 1) Run dry-run sync with confidence threshold
    const { test, results, summary } = await syncToActiveDirectory(true, confidenceThreshold);

    // 2) Return results as JSON with summary
    res.json({ success: true, test, results, summary });
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
    const { employeeIDs, confidenceThreshold = 0.4 } = req.body;
    
    if (!employeeIDs || !Array.isArray(employeeIDs) || employeeIDs.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request: employeeIDs array required' 
      });
    }
    
    const { test, results, summary } = await syncSelectedUsersToAD(employeeIDs, confidenceThreshold);
    res.json({ success: true, test, results, summary });
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
    const { confidenceThreshold = 0.4 } = req.body;
    const { test, results, summary } = await syncToActiveDirectory(false, confidenceThreshold);
    res.json({ success: true, test, results, summary });
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
    const { gatherEmployeeData, findUsersInAD } = await import('../services/hrisSyncService.js');
    
    // Get database connection for AD settings
    const dbPool = req.app.locals.dbPool;
    const SystemConfigService = (await import('../services/system-config-service.js')).default;
    const systemConfig = new SystemConfigService(dbPool);
    const adConfig = await systemConfig.getActiveDirectoryConfig();
    
    // Get raw counts
    const dbUsers = await gatherEmployeeData();
    const adUsers = await findUsersInAD(adConfig.baseDN);
    
    // Get HRIS database configuration
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
    const { confidenceThreshold = 0.4 } = req.query;
    const { debugEmployeeSync } = await import('../services/hrisSyncService.js');
    
    const debugInfo = await debugEmployeeSync(employeeId, parseFloat(confidenceThreshold));
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

// Test endpoint to demonstrate manager comparison logic with mock data
router.get('/test-manager-comparison/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`[DEBUG TEST] Testing manager comparison logic for username: ${username}`);
    
    // Mock AD user data based on the screenshots provided
    const mockAdUser = {
      sAMAccountName: username,
      userPrincipalName: `${username}@mti.co.id`,
      displayName: 'Reyhan Dayu Ramadhani',
      name: 'Reyhan Dayu Ramadhani',
      employeeID: 'MT100126',
      department: 'Human Resources',
      title: 'Mandarin Translator',
      manager: '', // Empty manager field as shown in screenshot
      mobile: '',
      mail: `${username}@mti.co.id`,
      distinguishedName: `CN=Reyhan Dayu Ramadhani,OU=Users,DC=mti,DC=co,DC=id`,
      cn: 'Reyhan Dayu Ramadhani'
    };
    
    // Mock HRIS employee data
    const mockHrisEmployee = {
      employee_id: 'MT100126',
      employee_name: 'Reyhan Dayu Ramadhani',
      department: 'Human Resources',
      position_title: 'Mandarin Translator',
      supervisor_id: 'MT100001', // Mock supervisor ID
      phone: '+62812345678'
    };
    
    console.log(`[DEBUG TEST] Mock AD User:`, JSON.stringify(mockAdUser, null, 2));
    console.log(`[DEBUG TEST] Mock HRIS Employee:`, JSON.stringify(mockHrisEmployee, null, 2));
    
    // Simulate the manager comparison logic from compareAdHrisFields function
    const discrepancies = [];
    const matches = [];
    
    // Compare department
    if (mockAdUser.department !== mockHrisEmployee.department) {
      discrepancies.push({
        field: 'department',
        adValue: mockAdUser.department || 'Not set',
        hrisValue: mockHrisEmployee.department || 'Not set',
        severity: 'high'
      });
    } else {
      matches.push('department');
    }
    
    // Compare title/position
    if (mockAdUser.title !== mockHrisEmployee.position_title) {
      discrepancies.push({
        field: 'title',
        adValue: mockAdUser.title || 'Not set',
        hrisValue: mockHrisEmployee.position_title || 'Not set',
        severity: 'medium'
      });
    } else {
      matches.push('title');
    }
    
    // Compare mobile/phone
    const adMobile = mockAdUser.mobile || '';
    const hrisPhone = mockHrisEmployee.phone || '';
    if (adMobile !== hrisPhone) {
      discrepancies.push({
        field: 'mobile',
        adValue: adMobile || 'Not set',
        hrisValue: hrisPhone || 'Not set',
        severity: 'low'
      });
    } else {
      // Both are the same (either both empty or both have same value)
      matches.push('mobile');
    }
    
    // Check supervisor/manager - THIS IS THE KEY LOGIC WE'RE TESTING
    let supervisorStatus = 'unknown';
    console.log(`[DEBUG TEST] Manager comparison - AD manager: "${mockAdUser.manager}", HRIS supervisor_id: "${mockHrisEmployee.supervisor_id}"`);
    
    // Helper function to check if employee ID is valid
    const isValidEmployeeId = (id) => {
      return id && typeof id === 'string' && id.trim().length > 0 && id !== 'null' && id !== 'undefined';
    };
    
    console.log(`[DEBUG TEST] isValidEmployeeId(${mockHrisEmployee.supervisor_id}): ${isValidEmployeeId(mockHrisEmployee.supervisor_id)}`);
    
    if (mockHrisEmployee.supervisor_id && isValidEmployeeId(mockHrisEmployee.supervisor_id)) {
      // We would need to look up the supervisor's DN, but for now just note the discrepancy
      if (!mockAdUser.manager) {
        console.log(`[DEBUG TEST] Adding manager discrepancy - AD has no manager but HRIS has supervisor: ${mockHrisEmployee.supervisor_id}`);
        discrepancies.push({
          field: 'manager',
          adValue: 'Not set',
          hrisValue: `Should be set (supervisor ID: ${mockHrisEmployee.supervisor_id})`,
          severity: 'high'
        });
        supervisorStatus = 'missing_in_ad';
      } else {
        // Both have values, would need to verify if they match
        matches.push('manager');
        supervisorStatus = 'needs_verification';
      }
    } else if (mockAdUser.manager) {
      console.log(`[DEBUG TEST] Adding manager discrepancy - AD has manager but HRIS supervisor is invalid/empty`);
      discrepancies.push({
        field: 'manager',
        adValue: mockAdUser.manager,
        hrisValue: 'Not set in HRIS',
        severity: 'medium'
      });
      supervisorStatus = 'extra_in_ad';
    } else {
      console.log(`[DEBUG TEST] Both AD manager and HRIS supervisor are empty/invalid - counting as match`);
      matches.push('manager');
      supervisorStatus = 'both_empty';
    }
    
    const fieldComparison = {
      hasDiscrepancies: discrepancies.length > 0,
      discrepancies,
      matches,
      supervisorStatus,
      summary: {
        totalFields: 4, // department, title, mobile, manager
        matchingFields: matches.length,
        discrepantFields: discrepancies.length,
        highSeverityIssues: discrepancies.filter(d => d.severity === 'high').length,
        mediumSeverityIssues: discrepancies.filter(d => d.severity === 'medium').length,
        lowSeverityIssues: discrepancies.filter(d => d.severity === 'low').length
      }
    };
    
    console.log(`[DEBUG TEST] Field comparison result:`, JSON.stringify(fieldComparison, null, 2));
    
    res.json({
      success: true,
      data: {
        username,
        found: true,
        searchMethod: 'mock_test_data',
        adUserDetails: mockAdUser,
        hrisMatching: {
          exactMatch: mockHrisEmployee,
          fuzzyMatches: [],
          fieldComparison,
          syncStatus: fieldComparison.hasDiscrepancies ? 'has_discrepancies' : 'in_sync'
        },
        analysis: {
          hasEmployeeID: !!mockAdUser.employeeID,
          employeeIDValue: mockAdUser.employeeID || 'Not set',
          hasExactHrisMatch: true,
          isInSync: !fieldComparison.hasDiscrepancies,
          hasDiscrepancies: fieldComparison.hasDiscrepancies,
          hasFuzzyMatches: false,
          testNote: 'This is a mock test demonstrating the manager comparison logic'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-manager-comparison endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check employees not found in AD with confidence levels
router.get('/debug-employees-not-in-ad', async (req, res) => {
  try {
    console.log('[DEBUG NOT IN AD] Starting employees not found in AD debug...');
    
    // Get threshold from query parameter (default 0.4)
    const threshold = parseFloat(req.query.threshold) || 0.4;
    console.log(`[DEBUG NOT IN AD] Using fuzzy matching threshold: ${threshold}`);
    
    // Get all HRIS employees
    const { gatherEmployeeData, findUsersInAD, fuzzyMatchAdUser } = await import('../services/hrisSyncService.js');
    const hrisEmployees = await gatherEmployeeData();
    console.log(`[DEBUG NOT IN AD] Found ${hrisEmployees.length} HRIS employees`);
    
    // Get database connection for AD settings
    const dbPool = req.app.locals.dbPool;
    const SystemConfigService = (await import('../services/system-config-service.js')).default;
    const systemConfig = new SystemConfigService(dbPool);
    const ad = await systemConfig.getActiveDirectoryConfig();
    
    // Get all AD users
    const adUsers = await findUsersInAD(ad.baseDN);
    console.log(`[DEBUG NOT IN AD] Found ${adUsers.length} AD users`);
    
    // Create a map of employee ID to AD user for quick lookup
    const adUserMap = new Map();
    adUsers.forEach(user => {
      if (user.employeeID) {
        adUserMap.set(user.employeeID, user);
      }
    });
    
    const employeesNotInAd = [];
    let checkedCount = 0;
    
    for (const employee of hrisEmployees) {
      if (!employee.employee_name || employee.employee_name.trim() === '') {
        continue; // Skip employees without names
      }
      
      checkedCount++;
      
      // Check if this employee exists in AD by employee ID
      const adUser = adUserMap.get(employee.employee_id);
      if (adUser) {
        continue; // Skip if employee found in AD
      }
      
      // Employee not found in AD - try fuzzy matching with confidence
      const fuzzyResult = fuzzyMatchAdUser(adUsers, employee.employee_name, threshold, true);
      
      employeesNotInAd.push({
        employee: {
          id: employee.employee_id,
          name: employee.employee_name,
          department: employee.department,
          position: employee.position_title,
          phone: employee.phone,
          gender: employee.gender
        },
        fuzzyMatching: {
          threshold: threshold,
          bestMatch: fuzzyResult.match ? {
            displayName: fuzzyResult.match.displayName,
            name: fuzzyResult.match.name,
            employeeID: fuzzyResult.match.employeeID,
            department: fuzzyResult.match.department,
            title: fuzzyResult.match.title
          } : null,
          confidence: fuzzyResult.confidence.bestConfidence,
          method: fuzzyResult.method,
          allMatches: fuzzyResult.confidence.searchResults.map(result => ({
            displayName: result.user.displayName,
            name: result.user.name,
            employeeID: result.user.employeeID,
            confidence: result.confidence,
            score: result.score
          }))
        },
        recommendations: generateNotInAdRecommendations(employee, fuzzyResult)
      });
    }
    
    console.log(`[DEBUG NOT IN AD] Checked ${checkedCount} employees`);
    console.log(`[DEBUG NOT IN AD] Found ${employeesNotInAd.length} employees not in AD`);
    
    // Analyze confidence distribution
    const confidenceDistribution = {
      high: employeesNotInAd.filter(e => e.fuzzyMatching.confidence >= 80).length,
      medium: employeesNotInAd.filter(e => e.fuzzyMatching.confidence >= 60 && e.fuzzyMatching.confidence < 80).length,
      low: employeesNotInAd.filter(e => e.fuzzyMatching.confidence >= 40 && e.fuzzyMatching.confidence < 60).length,
      veryLow: employeesNotInAd.filter(e => e.fuzzyMatching.confidence < 40).length
    };
    
    res.json({
      success: true,
      data: {
        summary: {
          totalHrisEmployees: hrisEmployees.length,
          totalAdUsers: adUsers.length,
          employeesChecked: checkedCount,
          employeesNotInAd: employeesNotInAd.length,
          threshold: threshold,
          confidenceDistribution
        },
        employees: employeesNotInAd.slice(0, 100), // Limit to first 100
        analysis: {
          thresholdInfo: {
            current: threshold,
            recommended: 0.4,
            description: 'Lower values = stricter matching, Higher values = more lenient matching'
          },
          confidenceGuide: {
            high: '80-100%: Very likely matches, safe to review',
            medium: '60-79%: Possible matches, needs manual review',
            low: '40-59%: Weak matches, probably different people',
            veryLow: '0-39%: Very unlikely matches or no matches found'
          }
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[DEBUG NOT IN AD] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to generate recommendations for employees not in AD
function generateNotInAdRecommendations(employee, fuzzyResult) {
  const recommendations = [];
  
  if (fuzzyResult.confidence.bestConfidence >= 80) {
    recommendations.push({
      type: 'high_confidence_match',
      message: 'High confidence match found - consider setting Employee ID in AD',
      action: 'Set Employee ID in AD user account'
    });
  } else if (fuzzyResult.confidence.bestConfidence >= 60) {
    recommendations.push({
      type: 'medium_confidence_match',
      message: 'Possible match found - manual review recommended',
      action: 'Manually verify if this is the same person'
    });
  } else if (fuzzyResult.confidence.bestConfidence >= 40) {
    recommendations.push({
      type: 'low_confidence_match',
      message: 'Weak match found - likely different people',
      action: 'Check if employee exists in AD with different name format'
    });
  } else {
    recommendations.push({
      type: 'no_match',
      message: 'No suitable matches found in AD',
      action: 'Employee may need to be created in Active Directory'
    });
  }
  
  // Additional recommendations based on employee data
  if (!employee.phone) {
    recommendations.push({
      type: 'missing_data',
      message: 'Missing phone number in HRIS',
      action: 'Update phone number in HRIS for better matching'
    });
  }
  
  if (!employee.department) {
    recommendations.push({
      type: 'missing_data',
      message: 'Missing department in HRIS',
      action: 'Update department in HRIS for better organization'
    });
  }
  
  return recommendations;
}

// Debug endpoint to check supervisor lookup issues
router.get('/debug-supervisor-lookup', async (req, res) => {
  try {
    console.log('[DEBUG SUPERVISOR] Starting supervisor lookup debug...');
    
    // Get all HRIS employees with supervisor IDs
    const hrisEmployees = await gatherEmployeeData();
    console.log(`[DEBUG SUPERVISOR] Found ${hrisEmployees.length} HRIS employees`);
    
    // Get database connection for AD settings
    const dbPool = req.app.locals.dbPool;
    const SystemConfigService = (await import('../services/system-config-service.js')).default;
    const systemConfig = new SystemConfigService(dbPool);
    const ad = await systemConfig.getActiveDirectoryConfig();
    
    // Get all AD users
    const adUsers = await findUsersInAD(ad.baseDN);
    console.log(`[DEBUG SUPERVISOR] Found ${adUsers.length} AD users`);
    
    // Create a map of employee ID to AD user for quick lookup
    const adUserMap = new Map();
    adUsers.forEach(user => {
      if (user.employeeID) {
        adUserMap.set(user.employeeID, user);
      }
    });
    
    const supervisorIssues = [];
    let checkedCount = 0;
    let issuesFound = 0;
    
    for (const employee of hrisEmployees) {
      if (!employee.supervisor_id || employee.supervisor_id.trim() === '') {
        continue; // Skip employees without supervisors
      }
      
      checkedCount++;
      
      // Check if this employee exists in AD
      const adUser = adUserMap.get(employee.employee_id);
      if (!adUser) {
        continue; // Skip if employee not in AD
      }
      
      // Check if supervisor exists in AD
      const supervisorInAd = adUserMap.get(employee.supervisor_id);
      
      if (!supervisorInAd) {
        // Supervisor not found in AD - this is the issue we're investigating
        issuesFound++;
        
        // Try to find supervisor by name or other methods
        const supervisorSearchResults = [];
        
        // Search by employee ID in different formats
        const supervisorId = employee.supervisor_id;
        const possibleFormats = [
          supervisorId,
          supervisorId.toUpperCase(),
          supervisorId.toLowerCase(),
          supervisorId.replace(/^0+/, ''), // Remove leading zeros
          '0' + supervisorId, // Add leading zero
        ];
        
        for (const format of possibleFormats) {
          const found = adUserMap.get(format);
          if (found) {
            supervisorSearchResults.push({
              method: `employeeID_format_${format}`,
              user: found
            });
          }
        }
        
        // Search by name if we have HRIS supervisor name
        // (This would require additional HRIS data with supervisor names)
        
        supervisorIssues.push({
          employee: {
            id: employee.employee_id,
            name: employee.employee_name,
            department: employee.department,
            supervisorId: employee.supervisor_id
          },
          adUser: {
            displayName: adUser.displayName,
            employeeID: adUser.employeeID,
            currentManager: adUser.manager || 'Not set'
          },
          issue: 'supervisor_not_found_in_ad',
          supervisorSearchResults,
          possibleCauses: [
            'Supervisor employee ID format mismatch',
            'Supervisor not synced to AD yet',
            'Supervisor terminated but still in HRIS',
            'Data entry error in HRIS supervisor ID'
          ]
        });
      }
    }
    
    console.log(`[DEBUG SUPERVISOR] Checked ${checkedCount} employees with supervisors`);
    console.log(`[DEBUG SUPERVISOR] Found ${issuesFound} supervisor lookup issues`);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalHrisEmployees: hrisEmployees.length,
          totalAdUsers: adUsers.length,
          employeesWithSupervisors: checkedCount,
          supervisorIssuesFound: issuesFound
        },
        issues: supervisorIssues.slice(0, 50), // Limit to first 50 issues
        analysis: {
          commonPatterns: analyzeSupervisorPatterns(supervisorIssues),
          recommendations: [
            'Check if supervisor employee IDs have format inconsistencies',
            'Verify if supervisors exist in HRIS but not in AD',
            'Review data entry processes for supervisor assignments',
            'Consider implementing fuzzy matching for supervisor lookups'
          ]
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[DEBUG SUPERVISOR] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to analyze supervisor issue patterns
function analyzeSupervisorPatterns(issues) {
  const patterns = {
    supervisorIdFormats: {},
    departmentDistribution: {},
    commonSupervisorIds: {}
  };
  
  issues.forEach(issue => {
    // Analyze supervisor ID formats
    const supervisorId = issue.employee.supervisorId;
    const format = getSupervisorIdFormat(supervisorId);
    patterns.supervisorIdFormats[format] = (patterns.supervisorIdFormats[format] || 0) + 1;
    
    // Analyze department distribution
    const dept = issue.employee.department || 'Unknown';
    patterns.departmentDistribution[dept] = (patterns.departmentDistribution[dept] || 0) + 1;
    
    // Track common supervisor IDs that are missing
    patterns.commonSupervisorIds[supervisorId] = (patterns.commonSupervisorIds[supervisorId] || 0) + 1;
  });
  
  return patterns;
}

// Helper function to determine supervisor ID format
function getSupervisorIdFormat(supervisorId) {
  if (!supervisorId) return 'empty';
  if (/^MT\d+$/.test(supervisorId)) return 'MT_format';
  if (/^\d+$/.test(supervisorId)) return 'numeric_only';
  if (/^[A-Z]+\d+$/.test(supervisorId)) return 'letters_numbers';
  return 'other';
}

export default router;
