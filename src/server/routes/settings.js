
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
    return {
      accountStatuses: ["Pending", "Active", "Inactive", "Suspended"],
      mailingLists: [
        { id: "1", name: "General Updates", isDefault: true },
        { id: "2", name: "Technical Team", isDefault: false },
        { id: "3", name: "Marketing", isDefault: false },
        { id: "4", name: "Management", isDefault: false }
      ],
      departments: [
        { id: "1", name: "Engineering", code: "ENG" },
        { id: "2", name: "Human Resources", code: "HR" },
        { id: "3", name: "Finance", code: "FIN" },
        { id: "4", name: "Marketing", code: "MKT" },
        { id: "5", name: "Sales", code: "SLS" }
      ],
      mailingListDisplayAsDropdown: true
    };
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

// Get all settings
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings', message: err.message });
  }
});

// Update account statuses
router.put('/account-statuses', (req, res) => {
  try {
    const { statuses } = req.body;
    
    if (!Array.isArray(statuses)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of statuses.' });
    }
    
    const settings = getSettings();
    settings.accountStatuses = statuses;
    
    saveSettings(settings);
    
    res.json({ success: true, message: 'Account statuses updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account statuses', message: err.message });
  }
});

// Update mailing lists
router.put('/mailing-lists', (req, res) => {
  try {
    const { mailingLists, displayAsDropdown } = req.body;
    
    if (!Array.isArray(mailingLists)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of mailing lists.' });
    }
    
    const settings = getSettings();
    settings.mailingLists = mailingLists;
    
    if (displayAsDropdown !== undefined) {
      settings.mailingListDisplayAsDropdown = displayAsDropdown;
    }
    
    saveSettings(settings);
    
    res.json({ success: true, message: 'Mailing lists updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update mailing lists', message: err.message });
  }
});

// Update departments
router.put('/departments', (req, res) => {
  try {
    const { departments } = req.body;
    
    if (!Array.isArray(departments)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of departments.' });
    }
    
    const settings = getSettings();
    settings.departments = departments;
    
    saveSettings(settings);
    
    res.json({ success: true, message: 'Departments updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update departments', message: err.message });
  }
});

export default router;
