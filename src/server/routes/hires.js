
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const HIRES_FILE = path.join(__dirname, '../data/hires.json');
const AUDIT_LOGS_FILE = path.join(__dirname, '../data/auditLogs.json');

// Generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get all hires
router.get('/', (req, res) => {
  const hires = JSON.parse(fs.readFileSync(HIRES_FILE, 'utf8'));
  res.json(hires);
});

// Get a single hire by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const hires = JSON.parse(fs.readFileSync(HIRES_FILE, 'utf8'));
  const hire = hires.find(h => h.id === id);
  
  if (hire) {
    res.json(hire);
  } else {
    res.status(404).json({ error: 'New hire not found' });
  }
});

// Create a new hire
router.post('/', (req, res) => {
  const hireData = req.body;
  
  if (!hireData.name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const hires = JSON.parse(fs.readFileSync(HIRES_FILE, 'utf8'));
  
  const newHire = {
    ...hireData,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  hires.push(newHire);
  fs.writeFileSync(HIRES_FILE, JSON.stringify(hires, null, 2), 'utf8');
  
  res.status(201).json(newHire);
});

// Update a hire
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  let hires = JSON.parse(fs.readFileSync(HIRES_FILE, 'utf8'));
  const index = hires.findIndex(h => h.id === id);
  
  if (index !== -1) {
    hires[index] = {
      ...hires[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    fs.writeFileSync(HIRES_FILE, JSON.stringify(hires, null, 2), 'utf8');
    res.json(hires[index]);
  } else {
    res.status(404).json({ error: 'New hire not found' });
  }
});

// Delete a hire
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  let hires = JSON.parse(fs.readFileSync(HIRES_FILE, 'utf8'));
  const initialLength = hires.length;
  hires = hires.filter(h => h.id !== id);
  
  if (hires.length < initialLength) {
    fs.writeFileSync(HIRES_FILE, JSON.stringify(hires, null, 2), 'utf8');
    res.status(204).end();
  } else {
    res.status(404).json({ error: 'New hire not found' });
  }
});

// Import hires
router.post('/import', (req, res) => {
  // In a real app, this would process the uploaded file
  // For this mock, we'll generate sample data
  const sampleData = Array(5).fill(null).map((_, index) => ({
    id: generateId(),
    name: `Employee ${index + 1}`,
    title: `Position ${index + 1}`,
    department: ["IT", "HR", "Finance", "Marketing", "Operations"][Math.floor(Math.random() * 5)],
    email: `employee${index + 1}@example.com`,
    direct_report: `Manager ${index % 3 + 1}`,
    phone_number: `555-${100 + index}`,
    mailing_list: "general,department",
    remarks: "",
    account_creation_status: Math.random() > 0.3 ? "Done" : "Pending",
    license_assigned: Math.random() > 0.5,
    status_srf: Math.random() > 0.5,
    username: `user${index + 1}`,
    password: "temporary",
    on_site_date: new Date(Date.now() + 86400000 * (index + 5)).toISOString().split("T")[0],
    microsoft_365_license: Math.random() > 0.3,
    laptop_ready: Math.random() > 0.3 ? "Ready" : "In Progress",
    note: "",
    ict_support_pic: `Support ${index % 3 + 1}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  
  // Create audit logs for each hire
  const auditLogs = [];
  sampleData.forEach(hire => {
    const log = {
      id: generateId(),
      new_hire_id: hire.id,
      action_type: "ACCOUNT_CREATION",
      status: Math.random() > 0.7 ? "ERROR" : "SUCCESS",
      message: Math.random() > 0.7 ? "User duplication in Active Directory" : "Account created successfully",
      performed_by: "system import",
      timestamp: new Date().toISOString()
    };
    auditLogs.push(log);
    
    // Add audit_logs reference to hire
    if (!hire.audit_logs) {
      hire.audit_logs = [];
    }
    hire.audit_logs.push(log);
  });
  
  // Read existing data
  let hires = JSON.parse(fs.readFileSync(HIRES_FILE, 'utf8'));
  let logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8'));
  
  // Update with new data
  hires = [...hires, ...sampleData];
  logs = [...logs, ...auditLogs];
  
  // Write back to files
  fs.writeFileSync(HIRES_FILE, JSON.stringify(hires, null, 2), 'utf8');
  fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  
  res.json({
    success: true,
    message: "Import successful",
    rowsImported: sampleData.length
  });
});

// Get audit logs for a hire
router.get('/:id/logs', (req, res) => {
  const { id } = req.params;
  const logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8'));
  const hireLogs = logs.filter(log => log.new_hire_id === id);
  res.json(hireLogs);
});

// Create an audit log
router.post('/:id/logs', (req, res) => {
  const { id } = req.params;
  const logData = req.body;
  
  const hires = JSON.parse(fs.readFileSync(HIRES_FILE, 'utf8'));
  const hire = hires.find(h => h.id === id);
  
  if (!hire) {
    return res.status(404).json({ error: 'New hire not found' });
  }
  
  const newLog = {
    ...logData,
    id: generateId(),
    new_hire_id: id,
    timestamp: new Date().toISOString()
  };
  
  // Add to audit logs file
  let logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8'));
  logs.push(newLog);
  fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  
  // Update hire with the new log reference
  const hireIndex = hires.findIndex(h => h.id === id);
  if (!hires[hireIndex].audit_logs) {
    hires[hireIndex].audit_logs = [];
  }
  hires[hireIndex].audit_logs.push(newLog);
  fs.writeFileSync(HIRES_FILE, JSON.stringify(hires, null, 2), 'utf8');
  
  res.status(201).json(newLog);
});

export default router;
