import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';

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
router.get('/', async (req, res) => {
  try {
    // Get settings from JSON for non-department settings
    const settings = getSettings();
    
    // Get departments from database
    try {
      const departments = await executeQuery('SELECT id, name, code FROM departments ORDER BY name');
      settings.departments = departments;
    } catch (dbError) {
      console.error('Error fetching departments from database:', dbError);
      // If database fails, use default departments or empty array
      if (!settings.departments) {
        settings.departments = [];
      }
    }
    
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

// Add this to src/server/routes/settings.js

// Get license types
router.get('/license-types', async (req, res) => {
  try {
    const licenseTypes = await executeQuery('SELECT id, name, description FROM ms365_license_types ORDER BY name');
    res.json(licenseTypes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get license types', message: err.message });
  }
});

// Add license type
router.post('/license-types', async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await executeQuery(
      'INSERT INTO ms365_license_types (id, name, description) VALUES (?, ?, ?)',
      [id, name, description || null]
    );
    res.status(201).json({ id, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add license type', message: err.message });
  }
});

// Update license type
router.put('/license-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    await executeQuery(
      'UPDATE ms365_license_types SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    res.json({ id, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update license type', message: err.message });
  }
});

// Delete license type
router.delete('/license-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if this license type is being used by any hires
    const hires = await executeQuery(
      'SELECT COUNT(*) as count FROM hires WHERE microsoft_365_license = (SELECT name FROM ms365_license_types WHERE id = ?)',
      [id]
    );
    
    if (hires.length > 0 && hires[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete license type that is used by ${hires[0].count} hire(s)` 
      });
    }
    
    await executeQuery('DELETE FROM ms365_license_types WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete license type', message: err.message });
  }
});

// Update departments - now using database
router.put('/departments', async (req, res) => {
  try {
    const { departments } = req.body;
    
    if (!Array.isArray(departments)) {
      return res.status(400).json({ error: 'Invalid format. Expected an array of departments.' });
    }

    try {
      // Get existing departments from database to determine what to insert/update/delete
      const existingDepartments = await executeQuery('SELECT id FROM departments');
      const existingIds = existingDepartments.map(dept => dept.id);
      
      // Process each department without using transactions
      for (const dept of departments) {
        if (existingIds.includes(dept.id)) {
          // Update existing department
          await executeQuery(
            'UPDATE departments SET name = ?, code = ? WHERE id = ?',
            [dept.name, dept.code, dept.id]
          );
        } else {
          // Insert new department
          await executeQuery(
            'INSERT INTO departments (id, name, code) VALUES (?, ?, ?)',
            [dept.id, dept.name, dept.code]
          );
        }
      }
      
      // Delete departments that no longer exist
      const currentIds = departments.map(dept => dept.id);
      const idsToDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (idsToDelete.length > 0) {
        // Check if any employees are using these departments before deleting
        for (const id of idsToDelete) {
          const dept = existingDepartments.find(d => d.id === id);
          if (dept) {
            const deptName = await executeQuery('SELECT name FROM departments WHERE id = ?', [id]);
            if (deptName.length > 0) {
              const hires = await executeQuery('SELECT COUNT(*) as count FROM hires WHERE department = ?', [deptName[0].name]);
              if (hires.length > 0 && hires[0].count > 0) {
                return res.status(400).json({ 
                  error: `Cannot delete department that is used by ${hires[0].count} employee(s)` 
                });
              }
            }
          }
        }
        
        // Safe to delete
        for (const id of idsToDelete) {
          await executeQuery('DELETE FROM departments WHERE id = ?', [id]);
        }
      }
      
      res.json({ success: true, message: 'Departments updated successfully' });
    } catch (dbError) {
      console.error('Database error updating departments:', dbError);
      
      // Fallback to file storage if database fails
      const settings = getSettings();
      settings.departments = departments;
      saveSettings(settings);
      
      res.json({ 
        success: true, 
        message: 'Departments updated in file storage due to database error',
        warning: dbError.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update departments', message: err.message });
  }
});

// Add this to your existing routes
router.get('/whatsapp', (req, res) => {
  try {
    // Read the settings file
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Return WhatsApp settings or default values
    const whatsappSettings = settings.whatsappSettings || {
      apiUrl: '',
      defaultMessage: `Welcome aboard to PT. Merdeka Tsingshan Indonesia. 
By this message, we inform you regarding your account information for the email address: {{email}}
Name: {{name}}
Title: {{title}}
Department: {{department}}
Email: {{email}}
Password: {{password}}

Please don't hesitate to contact IT for any question.`
    };
    
    res.json(whatsappSettings);
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
  }
});

router.put('/whatsapp', (req, res) => {
  try {
    const { apiUrl, defaultMessage } = req.body;
    
    // Read current settings
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Update WhatsApp settings
    settings.whatsappSettings = {
      apiUrl,
      defaultMessage
    };
    
    // Write updated settings back to file
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    
    res.json(settings.whatsappSettings);
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to update WhatsApp settings' });
  }
});

export default router;
