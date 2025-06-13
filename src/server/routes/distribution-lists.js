
import express from 'express';
import exchangeService from '../services/exchangeService.js';
import { executeQuery } from '../utils/dbConnection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to get Exchange Online settings
const getExchangeSettings = () => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return settings.exchangeOnlineSettings || null;
  } catch (error) {
    console.error('Error reading Exchange Online settings:', error);
    return null;
  }
};

// Helper function to ensure Exchange Online connection
const ensureExchangeConnection = async () => {
  const settings = getExchangeSettings();
  if (!settings || !settings.enabled) {
    throw new Error('Exchange Online integration is not enabled');
  }

  if (!settings.appId || !settings.tenantId || !settings.certificateThumbprint) {
    throw new Error('Exchange Online settings are incomplete');
  }

  if (!exchangeService.isConnected) {
    await exchangeService.connectToExchangeOnline(
      settings.appId,
      settings.tenantId,
      settings.certificateThumbprint
    );
  }
};

// Sync user to distribution groups based on assigned mailing lists
router.post('/sync-user', async (req, res) => {
  try {
    const { hireId, mailingLists } = req.body;

    if (!hireId || !Array.isArray(mailingLists)) {
      return res.status(400).json({ error: 'Invalid request. Hire ID and mailing lists are required.' });
    }

    // Get hire information
    const hires = await executeQuery('SELECT email, first_name, last_name FROM hires WHERE id = ?', [hireId]);
    if (hires.length === 0) {
      return res.status(404).json({ error: 'Hire not found' });
    }

    const hire = hires[0];
    if (!hire.email) {
      return res.status(400).json({ error: 'Hire does not have an email address' });
    }

    await ensureExchangeConnection();

    const results = [];
    const errors = [];

    // Process each mailing list
    for (const mailingListEmail of mailingLists) {
      try {
        const result = await exchangeService.addUserToDistributionGroup(hire.email, mailingListEmail);
        results.push({
          distributionGroup: mailingListEmail,
          ...result
        });

        // Log the operation
        const auditLog = {
          id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          hire_id: hireId,
          action: 'sync_distribution_group',
          details: `Added to distribution group: ${mailingListEmail}`,
          performed_by: req.user?.username || 'System',
          created_at: new Date().toISOString()
        };

        await executeQuery(
          'INSERT INTO audit_logs (id, hire_id, action, details, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [auditLog.id, auditLog.hire_id, auditLog.action, auditLog.details, auditLog.performed_by, auditLog.created_at]
        );

      } catch (error) {
        console.error(`Error adding user to ${mailingListEmail}:`, error);
        errors.push({
          distributionGroup: mailingListEmail,
          error: error.message
        });
      }
    }

    // Update hire record with sync status
    const syncStatus = errors.length === 0 ? 'Synced' : (results.length > 0 ? 'Partial' : 'Failed');
    await executeQuery(
      'UPDATE hires SET distribution_list_sync_status = ?, distribution_list_sync_date = ? WHERE id = ?',
      [syncStatus, new Date().toISOString(), hireId]
    );

    res.json({
      success: true,
      message: `Sync completed. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors,
      syncStatus
    });

  } catch (error) {
    console.error('Error syncing user to distribution groups:', error);
    res.status(500).json({ error: 'Failed to sync user to distribution groups', message: error.message });
  }
});

// Remove user from distribution groups
router.post('/remove-user', async (req, res) => {
  try {
    const { hireId, mailingLists } = req.body;

    if (!hireId || !Array.isArray(mailingLists)) {
      return res.status(400).json({ error: 'Invalid request. Hire ID and mailing lists are required.' });
    }

    // Get hire information
    const hires = await executeQuery('SELECT email, first_name, last_name FROM hires WHERE id = ?', [hireId]);
    if (hires.length === 0) {
      return res.status(404).json({ error: 'Hire not found' });
    }

    const hire = hires[0];
    if (!hire.email) {
      return res.status(400).json({ error: 'Hire does not have an email address' });
    }

    await ensureExchangeConnection();

    const results = [];
    const errors = [];

    // Process each mailing list
    for (const mailingListEmail of mailingLists) {
      try {
        const result = await exchangeService.removeUserFromDistributionGroup(hire.email, mailingListEmail);
        results.push({
          distributionGroup: mailingListEmail,
          ...result
        });

        // Log the operation
        const auditLog = {
          id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          hire_id: hireId,
          action: 'remove_distribution_group',
          details: `Removed from distribution group: ${mailingListEmail}`,
          performed_by: req.user?.username || 'System',
          created_at: new Date().toISOString()
        };

        await executeQuery(
          'INSERT INTO audit_logs (id, hire_id, action, details, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [auditLog.id, auditLog.hire_id, auditLog.action, auditLog.details, auditLog.performed_by, auditLog.created_at]
        );

      } catch (error) {
        console.error(`Error removing user from ${mailingListEmail}:`, error);
        errors.push({
          distributionGroup: mailingListEmail,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Removal completed. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors
    });

  } catch (error) {
    console.error('Error removing user from distribution groups:', error);
    res.status(500).json({ error: 'Failed to remove user from distribution groups', message: error.message });
  }
});

// Get user's current distribution group memberships
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    await ensureExchangeConnection();

    const groups = await exchangeService.getUserDistributionGroups(email);
    
    res.json({
      success: true,
      email,
      distributionGroups: groups
    });

  } catch (error) {
    console.error('Error getting user distribution groups:', error);
    res.status(500).json({ error: 'Failed to get user distribution groups', message: error.message });
  }
});

// Get all available distribution groups
router.get('/', async (req, res) => {
  try {
    await ensureExchangeConnection();

    const groups = await exchangeService.getAllDistributionGroups();
    
    res.json({
      success: true,
      distributionGroups: groups
    });

  } catch (error) {
    console.error('Error getting distribution groups:', error);
    res.status(500).json({ error: 'Failed to get distribution groups', message: error.message });
  }
});

// Test Exchange Online connection
router.post('/test-connection', async (req, res) => {
  try {
    const { appId, tenantId, certificateThumbprint } = req.body;

    if (!appId || !tenantId || !certificateThumbprint) {
      return res.status(400).json({ error: 'App ID, Tenant ID, and Certificate Thumbprint are required' });
    }

    const result = await exchangeService.testConnection(appId, tenantId, certificateThumbprint);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error testing Exchange Online connection:', error);
    res.status(500).json({ error: 'Failed to test connection', message: error.message });
  }
});

export default router;
