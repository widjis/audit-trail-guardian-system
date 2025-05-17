
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { executeQuery } from '../utils/dbConnection.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Data storage paths
const DATA_DIR = path.join(__dirname, '../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for reading/writing settings
const getSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return settings;
    }
    return {};
  } catch (err) {
    console.error('Error reading settings file:', err);
    throw err;
  }
};

const saveSettings = (settings) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing settings file:', err);
    throw err;
  }
};

// Mock Active Directory Integration
// In a real implementation, this would use a library like 'activedirectory2' or 'ldapjs'
const mockADConnection = (settings) => {
  // This is a mock function that simulates connecting to AD
  // In production, this would be replaced with actual AD integration
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!settings.server || !settings.username || !settings.password) {
        reject(new Error("Missing required connection parameters"));
        return;
      }
      
      // Simulate connection success/failure
      if (settings.server.includes('.') && settings.username.length > 3 && settings.password.length > 3) {
        resolve({ success: true, message: "Connected successfully" });
      } else {
        reject(new Error("Connection failed: Invalid server address or credentials"));
      }
    }, 1000);
  });
};

const mockCreateADUser = (userData) => {
  // This is a mock function that simulates creating a user in AD
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!userData.username || !userData.password || !userData.displayName) {
        reject(new Error("Missing required user parameters"));
        return;
      }
      
      // Simulate user creation
      if (userData.username.length > 2) {
        resolve({
          success: true,
          message: `User ${userData.username} created successfully`,
          details: {
            samAccountName: userData.username,
            displayName: userData.displayName,
            distinguishedName: `CN=${userData.displayName},${userData.ou}`,
            groups: [userData.acl, 'VPN-USERS']
          }
        });
      } else {
        reject(new Error("Failed to create user: Invalid username"));
      }
    }, 1500);
  });
};

// Get AD settings
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    const adSettings = settings.activeDirectorySettings || {
      server: '',
      username: '',
      password: '',
      domain: 'mbma.com',
      baseDN: 'DC=mbma,DC=com',
      enabled: false
    };
    
    // Don't send the password back to the client
    const safeSettings = { ...adSettings };
    if (safeSettings.password) {
      safeSettings.password = '••••••••';
    }
    
    res.json(safeSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Active Directory settings', message: err.message });
  }
});

// Update AD settings
router.put('/', (req, res) => {
  try {
    const adSettings = req.body;
    const settings = getSettings();
    
    // If there's already a password saved and the incoming password is masked,
    // keep the original password
    if (settings.activeDirectorySettings && adSettings.password === '••••••••') {
      adSettings.password = settings.activeDirectorySettings.password;
    }
    
    settings.activeDirectorySettings = adSettings;
    saveSettings(settings);
    
    // Don't send the password back to the client
    const safeSettings = { ...adSettings };
    if (safeSettings.password) {
      safeSettings.password = '••••••••';
    }
    
    res.json(safeSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Active Directory settings', message: err.message });
  }
});

// Test AD connection
router.post('/test', async (req, res) => {
  try {
    const settings = req.body;
    
    // In a real implementation, this would test the connection to your AD server
    await mockADConnection(settings);
    
    res.json({ success: true, message: "Connection successful" });
  } catch (err) {
    res.status(400).json({ error: `Connection failed: ${err.message}` });
  }
});

// Create AD user
router.post('/create-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    // First, check if AD integration is enabled
    const settings = getSettings();
    if (!settings.activeDirectorySettings || !settings.activeDirectorySettings.enabled) {
      return res.status(400).json({ error: "Active Directory integration is not enabled" });
    }
    
    // In a real implementation, this would create a user in your AD server
    const result = await mockCreateADUser(userData);
    
    // If successful, update the hire record to mark the account as created
    if (result.success) {
      try {
        await executeQuery('UPDATE hires SET account_status = ? WHERE id = ?', ['Active', id]);
        
        // Add an audit log entry for the AD account creation
        const timestamp = new Date().toISOString();
        const audit = {
          id: Math.random().toString(36).slice(2),
          hire_id: id,
          action: 'AD_ACCOUNT_CREATED',
          details: JSON.stringify({
            username: userData.username,
            displayName: userData.displayName,
            ou: userData.ou
          }),
          created_by: req.user?.username || 'system',
          created_at: timestamp
        };
        
        // Insert the audit log into the database
        await executeQuery(
          'INSERT INTO audit_logs (id, hire_id, action, details, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [audit.id, audit.hire_id, audit.action, audit.details, audit.created_by, audit.created_at]
        );
      } catch (dbError) {
        // Using the correct logger format for the server
        logger.db.error('Database error after AD account creation:', dbError);
        // Still return success, but with a warning
        return res.json({
          ...result,
          warning: "AD account created but database update failed"
        });
      }
    }
    
    res.json(result);
  } catch (err) {
    // Using the correct logger format for the server
    logger.api.error('Error creating AD user:', err);
    res.status(500).json({ error: `Failed to create AD user: ${err.message}` });
  }
});

export default router;
