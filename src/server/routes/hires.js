
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get all hires
router.get('/', async (req, res) => {
  try {
    // Query all hires from database
    const hires = await executeQuery(`
      SELECT * FROM hires ORDER BY created_at DESC
    `);
    
    // Get audit logs for each hire
    for (const hire of hires) {
      const auditLogs = await executeQuery(`
        SELECT * FROM audit_logs WHERE new_hire_id = ? ORDER BY timestamp DESC
      `, [hire.id]);
      
      hire.audit_logs = auditLogs;
    }
    
    res.json(hires);
  } catch (error) {
    console.error('Error fetching hires from database:', error);
    res.status(500).json({ error: 'Failed to get hires', message: error.message });
  }
});

// Get a single hire by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const hires = await executeQuery(`
      SELECT * FROM hires WHERE id = ?
    `, [id]);
    
    if (hires.length === 0) {
      return res.status(404).json({ error: 'New hire not found' });
    }
    
    const hire = hires[0];
    
    // Get audit logs for this hire
    const auditLogs = await executeQuery(`
      SELECT * FROM audit_logs WHERE new_hire_id = ? ORDER BY timestamp DESC
    `, [id]);
    
    hire.audit_logs = auditLogs;
    
    res.json(hire);
  } catch (error) {
    console.error('Error fetching hire from database:', error);
    res.status(500).json({ error: 'Failed to get hire', message: error.message });
  }
});

// Create a new hire
router.post('/', async (req, res) => {
  const hireData = req.body;
  
  if (!hireData.name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    const id = generateId();
    const now = new Date().toISOString();
    
    // Build columns and values for SQL insert
    const columns = ['id', 'created_at', 'updated_at'];
    const placeholders = ['?', '?', '?'];
    const values = [id, now, now];
    
    // Add all properties from hireData
    for (const [key, value] of Object.entries(hireData)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'audit_logs') {
        columns.push(key);
        placeholders.push('?');
        
        // Handle boolean values for SQL Server
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }
    
    // Construct and execute SQL query
    const query = `
      INSERT INTO hires (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;
    
    await executeQuery(query, values);
    
    // Get the inserted hire
    const newHires = await executeQuery(`
      SELECT * FROM hires WHERE id = ?
    `, [id]);
    
    const newHire = newHires[0];
    newHire.audit_logs = [];
    
    res.status(201).json(newHire);
  } catch (error) {
    console.error('Error creating hire in database:', error);
    res.status(500).json({ error: 'Failed to create hire', message: error.message });
  }
});

// Update a hire
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  try {
    // Check if hire exists
    const hires = await executeQuery(`
      SELECT * FROM hires WHERE id = ?
    `, [id]);
    
    if (hires.length === 0) {
      return res.status(404).json({ error: 'New hire not found' });
    }
    
    const now = new Date().toISOString();
    
    // Build SET clause and values for SQL update
    const setClause = ['updated_at = ?'];
    const values = [now];
    
    // Add all properties from updateData
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'audit_logs') {
        setClause.push(`${key} = ?`);
        
        // Handle boolean values for SQL Server
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }
    
    // Add ID to values array for the WHERE clause
    values.push(id);
    
    // Construct and execute SQL query
    const query = `
      UPDATE hires
      SET ${setClause.join(', ')}
      WHERE id = ?
    `;
    
    await executeQuery(query, values);
    
    // Get the updated hire
    const updatedHires = await executeQuery(`
      SELECT * FROM hires WHERE id = ?
    `, [id]);
    
    const updatedHire = updatedHires[0];
    
    // Get audit logs for this hire
    const auditLogs = await executeQuery(`
      SELECT * FROM audit_logs WHERE new_hire_id = ? ORDER BY timestamp DESC
    `, [id]);
    
    updatedHire.audit_logs = auditLogs;
    
    res.json(updatedHire);
  } catch (error) {
    console.error('Error updating hire in database:', error);
    res.status(500).json({ error: 'Failed to update hire', message: error.message });
  }
});

// Delete a hire
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if hire exists
    const hires = await executeQuery(`
      SELECT * FROM hires WHERE id = ?
    `, [id]);
    
    if (hires.length === 0) {
      return res.status(404).json({ error: 'New hire not found' });
    }
    
    // Delete associated audit logs first (should be handled by CASCADE but let's be sure)
    await executeQuery(`
      DELETE FROM audit_logs WHERE new_hire_id = ?
    `, [id]);
    
    // Delete the hire
    await executeQuery(`
      DELETE FROM hires WHERE id = ?
    `, [id]);
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting hire from database:', error);
    res.status(500).json({ error: 'Failed to delete hire', message: error.message });
  }
});

// Import hires
router.post('/import', async (req, res) => {
  try {
    // Generate sample data for import (in a real app, this would process uploaded data)
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
    }));
    
    // Import each hire into the database
    const importedHires = [];
    const auditLogs = [];
    
    for (const hire of sampleData) {
      const now = new Date().toISOString();
      hire.created_at = now;
      hire.updated_at = now;
      
      // Convert boolean values for SQL Server
      const hireSql = {
        ...hire,
        license_assigned: hire.license_assigned ? 1 : 0,
        status_srf: hire.status_srf ? 1 : 0,
        microsoft_365_license: hire.microsoft_365_license ? 1 : 0
      };
      
      // Build columns and values for SQL insert
      const columns = Object.keys(hireSql);
      const placeholders = Array(columns.length).fill('?');
      const values = Object.values(hireSql);
      
      // Insert hire into database
      const query = `
        INSERT INTO hires (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;
      
      await executeQuery(query, values);
      
      // Create an audit log for this hire
      const logId = generateId();
      const log = {
        id: logId,
        new_hire_id: hire.id,
        action_type: "ACCOUNT_CREATION",
        status: Math.random() > 0.7 ? "ERROR" : "SUCCESS",
        message: Math.random() > 0.7 ? "User duplication in Active Directory" : "Account created successfully",
        performed_by: "system import",
        timestamp: now
      };
      
      // Insert audit log into database
      await executeQuery(`
        INSERT INTO audit_logs (id, new_hire_id, action_type, status, message, performed_by, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [log.id, log.new_hire_id, log.action_type, log.status, log.message, log.performed_by, log.timestamp]);
      
      auditLogs.push(log);
      importedHires.push({...hire, audit_logs: [log]});
    }
    
    res.json({
      success: true,
      message: "Import successful",
      rowsImported: sampleData.length
    });
  } catch (error) {
    console.error('Error importing hires to database:', error);
    res.status(500).json({ error: 'Failed to import hires', message: error.message });
  }
});

// Get audit logs for a hire
router.get('/:id/logs', async (req, res) => {
  const { id } = req.params;
  
  try {
    const logs = await executeQuery(`
      SELECT * FROM audit_logs 
      WHERE new_hire_id = ? 
      ORDER BY timestamp DESC
    `, [id]);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs from database:', error);
    res.status(500).json({ error: 'Failed to get audit logs', message: error.message });
  }
});

// Create an audit log
router.post('/:id/logs', async (req, res) => {
  const { id } = req.params;
  const logData = req.body;
  
  try {
    // Check if hire exists
    const hires = await executeQuery(`
      SELECT * FROM hires WHERE id = ?
    `, [id]);
    
    if (hires.length === 0) {
      return res.status(404).json({ error: 'New hire not found' });
    }
    
    const logId = generateId();
    const now = new Date().toISOString();
    
    // Create new audit log
    const newLog = {
      ...logData,
      id: logId,
      new_hire_id: id,
      timestamp: now
    };
    
    // Insert audit log into database
    await executeQuery(`
      INSERT INTO audit_logs (id, new_hire_id, action_type, status, message, details, performed_by, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newLog.id, 
      newLog.new_hire_id, 
      newLog.action_type, 
      newLog.status, 
      newLog.message, 
      newLog.details || null, 
      newLog.performed_by || null, 
      newLog.timestamp
    ]);
    
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating audit log in database:', error);
    res.status(500).json({ error: 'Failed to create audit log', message: error.message });
  }
});

export default router;
