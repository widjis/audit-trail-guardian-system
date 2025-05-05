
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// Get all settings
router.get('/', (req, res) => {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  res.json(settings);
});

// Update account status settings
router.put('/account-status', (req, res) => {
  const { accountStatuses } = req.body;
  
  if (!Array.isArray(accountStatuses)) {
    return res.status(400).json({ error: 'Account statuses must be an array' });
  }
  
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  settings.accountStatuses = accountStatuses;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  
  res.json({ success: true, accountStatuses });
});

// Update mailing list settings
router.put('/mailing-lists', (req, res) => {
  const { mailingLists, mailingListDisplayAsDropdown } = req.body;
  
  if (!Array.isArray(mailingLists)) {
    return res.status(400).json({ error: 'Mailing lists must be an array' });
  }
  
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  
  if (mailingLists) {
    settings.mailingLists = mailingLists;
  }
  
  if (mailingListDisplayAsDropdown !== undefined) {
    settings.mailingListDisplayAsDropdown = mailingListDisplayAsDropdown;
  }
  
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  
  res.json({ 
    success: true, 
    mailingLists: settings.mailingLists,
    mailingListDisplayAsDropdown: settings.mailingListDisplayAsDropdown
  });
});

// Update department settings
router.put('/departments', (req, res) => {
  const { departments } = req.body;
  
  if (!Array.isArray(departments)) {
    return res.status(400).json({ error: 'Departments must be an array' });
  }
  
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  settings.departments = departments;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  
  res.json({ success: true, departments });
});

export default router;
