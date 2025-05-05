
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';
import logger from '../utils/logger.js';

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
    logger.api.info('GET /hires - Fetching all hires');
    // Query all hires from database
    const hires = await executeQuery(`
      SELECT * FROM hires ORDER BY created_at DESC
    `);
    logger.api.info(`Retrieved ${hires.length} hires from database`);
    
    // Get audit logs for each hire
    for (const hire of hires) {
      const auditLogs = await executeQuery(`
        SELECT * FROM audit_logs WHERE new_hire_id = ? ORDER BY timestamp DESC
      `, [hire.id]);
      
      hire.audit_logs = auditLogs;
      logger.api.debug(`Retrieved ${auditLogs.length} audit logs for hire ${hire.id}`);
    }
    
    res.json(hires);
  } catch (error) {
    logger.api.error('Error fetching hires from database:', error);
    res.status(500).json({ error: 'Failed to get hires', message: error.message });
  }
});

// Download CSV template - moved BEFORE the /:id route to prevent route masking
router.get('/template', (req, res) => {
  try {
    logger.api.info('GET /hires/template - Generating CSV template');
    
    // Define the CSV headers based on required fields
    const headers = [
      'name',
      'title',
      'department',
      'email',
      'direct_report',
      'phone_number',
      'mailing_list',
      'account_creation_status',
      'username',         // Added username field
      'password',         // Added password field
      'on_site_date',
      'ict_support_pic',
      'remarks',
      'license_assigned',
      'status_srf',
      'microsoft_365_license',
      'laptop_ready',
      'note'
    ];
    
    // Create CSV content with headers
    let csvContent = headers.join(',') + '\n';
    
    // Add an example row with sample data - ensure proper CSV formatting with quotes for values that might contain commas
    const exampleData = [
      'John Doe',
      'Software Engineer',
      'IT',
      'john.doe@example.com',
      'Jane Smith',
      '555-1234',
      'engineering,all-staff', 
      'Pending',
      'john.doe',          // Example username
      'temporary123',      // Example password
      '2025-06-01',
      'Tech Support A',
      'New graduate hire',
      'false',
      'true',
      'false',
      'In Progress',
      'Needs dual monitors'
    ];
    
    // Properly format CSV row with quotes around fields that contain commas
    const formattedRow = exampleData.map(field => {
      // If field contains commas, enclose in quotes
      return field.includes(',') ? `"${field}"` : field;
    }).join(',');
    
    csvContent += formattedRow;
    
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=new_hire_template.csv');
    
    // Send the CSV content
    res.send(csvContent);
    logger.api.info('CSV template generated and sent successfully');
  } catch (error) {
    logger.api.error('Error generating CSV template:', error);
    res.status(500).json({ error: 'Failed to generate CSV template', message: error.message });
  }
});

// Get a single hire by ID - must come AFTER the /template route
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[Backend] GET /hires/${id} - Fetching single hire`);
  
  try {
    const hires = await executeQuery(`
      SELECT * FROM hires WHERE id = ?
    `, [id]);
    
    if (hires.length === 0) {
      console.log(`[Backend] Hire with ID ${id} not found`);
      return res.status(404).json({ error: 'New hire not found' });
    }
    
    const hire = hires[0];
    console.log(`[Backend] Retrieved hire: ${hire.name} (${hire.id})`);
    
    // Get audit logs for this hire
    const auditLogs = await executeQuery(`
      SELECT * FROM audit_logs WHERE new_hire_id = ? ORDER BY timestamp DESC
    `, [id]);
    
    console.log(`[Backend] Retrieved ${auditLogs.length} audit logs for hire ${id}`);
    hire.audit_logs = auditLogs;
    
    res.json(hire);
  } catch (error) {
    console.error(`[Backend] Error fetching hire ${id} from database:`, error);
    res.status(500).json({ error: 'Failed to get hire', message: error.message });
  }
});

// Create a new hire
router.post('/', async (req, res) => {
  const hireData = req.body;
  logger.api.info('POST /hires - Creating new hire');
  logger.api.debug('Received hire data:', JSON.stringify(hireData, null, 2));
  
  if (!hireData.name) {
    logger.api.warn('Validation error: Name is required');
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    const id = generateId();
    const now = new Date().toISOString();
    logger.api.debug(`Generated ID: ${id}, timestamp: ${now}`);
    
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
          logger.api.debug(`Converting boolean field ${key}: ${value} to ${value ? 1 : 0}`);
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
    
    logger.api.debug('Executing SQL query:', query);
    logger.api.debug('Query values:', JSON.stringify(values));
    
    try {
      await executeQuery(query, values);
      logger.api.info('Insert query executed successfully');
      
      // Get the inserted hire
      const newHires = await executeQuery(`
        SELECT * FROM hires WHERE id = ?
      `, [id]);
      
      logger.api.debug('Query to retrieve new hire returned:', JSON.stringify(newHires));
      
      if (newHires.length === 0) {
        logger.api.error('Failed to retrieve newly created hire');
        return res.status(500).json({ error: 'Failed to retrieve newly created hire' });
      }
      
      const newHire = newHires[0];
      logger.api.info('Retrieved newly created hire:', JSON.stringify(newHire));
      newHire.audit_logs = [];
      
      // Convert numeric values to booleans for the response
      if (typeof newHire.license_assigned === 'number') {
        newHire.license_assigned = newHire.license_assigned === 1;
      }
      if (typeof newHire.status_srf === 'number') {
        newHire.status_srf = newHire.status_srf === 1;
      }
      if (typeof newHire.microsoft_365_license === 'number') {
        newHire.microsoft_365_license = newHire.microsoft_365_license === 1;
      }
      
      logger.api.info('Sending response with new hire');
      return res.status(201).json(newHire);
    } catch (dbError) {
      logger.api.error('Database error during insert:', dbError);
      logger.api.error('SQL Query that failed:', query);
      logger.api.error('SQL Parameters:', values);
      
      // Check if it's a duplicate key error
      if (dbError.number === 2627 || dbError.code === '23505') {
        return res.status(409).json({ error: 'A hire with this ID already exists' });
      }
      throw dbError;
    }
  } catch (error) {
    logger.api.error('Error creating hire in database:', error);
    logger.api.error('Error details:', error.message);
    if (error.stack) {
      logger.api.error('Error stack:', error.stack);
    }
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

export default router;
