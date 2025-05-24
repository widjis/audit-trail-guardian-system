// server/routes/hrisSyncRoutes.js

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';  // npm install date-fns
import {
  syncToActiveDirectory,
  findUsersInAD,
  loadSettings
} from '../services/hrisSyncService.js';

// ES-module __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();


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
