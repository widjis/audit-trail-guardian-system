import express from 'express';
import { syncToActiveDirectory , findUsersInAD, loadSettings } from '../services/hrisSyncService.js';

const router = express.Router();

// Test sync (no writes)
router.get('/test', async (req, res) => {
  try {
    const results = await syncToActiveDirectory(true);
    res.json({ success: true, test: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real sync (writes)
router.post('/', async (req, res) => {
  try {
    const results = await syncToActiveDirectory(false);
    res.json({ success: true, test: false, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hris-sync/query
 * Returns all AD users under the configured baseDN
 */
router.get('/query', async (req, res) => {
    try {
      // grab baseDN from settings.json
      const { activeDirectorySettings: ad } = loadSettings();
  
      // fetch *all* users via your shared service
      const users = await findUsersInAD(ad.baseDN);
  
      res.json({ success: true, baseDN: ad.baseDN, count: users.length, users });
    } catch (err) {
      console.error('[HRIS] /query error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
