import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';
import logger from '../utils/logger.js';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
    
    // Set ICT Support PIC from authenticated user if available
    if (req.user && !hireData.ict_support_pic) {
      hireData.ict_support_pic = req.user.username;
      logger.api.info(`Setting ICT Support PIC to ${hireData.ict_support_pic}`);
    }
    
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
    
    // Always set ICT Support PIC from authenticated user if available
    if (req.user && req.user.username) {
      updateData.ict_support_pic = req.user.username;
      logger.api.info(`Setting ICT Support PIC to ${updateData.ict_support_pic} for hire ${id}`);
    } else {
      logger.api.warn(`No authenticated user available for setting ICT Support PIC on hire ${id}`);
    }
    
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
    
    logger.api.debug("Executing update query:", query);
    logger.api.debug("Update query values:", values);
    
    await executeQuery(query, values);
    
    // Create an audit log entry for this update
    const logId = generateId();
    const auditLog = {
      id: logId,
      new_hire_id: id,
      action_type: "UPDATE",
      status: "SUCCESS",
      message: "Record updated",
      details: JSON.stringify(updateData),
      performed_by: req.user ? req.user.username : "system",
      timestamp: now
    };
    
    // Insert audit log
    await executeQuery(`
      INSERT INTO audit_logs (id, new_hire_id, action_type, status, message, details, performed_by, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      auditLog.id, 
      auditLog.new_hire_id, 
      auditLog.action_type, 
      auditLog.status, 
      auditLog.message, 
      auditLog.details, 
      auditLog.performed_by, 
      auditLog.timestamp
    ]);
    
    logger.api.info(`Created audit log ${logId} for hire update ${id}`);
    
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
    logger.api.error('Error updating hire in database:', error);
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

// Bulk delete hires
router.post('/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty IDs array' });
  }
  
  try {
    logger.api.info(`Bulk deleting ${ids.length} hires`);
    
    // Delete associated audit logs first (should be handled by CASCADE but let's be sure)
    for (const id of ids) {
      await executeQuery(`
        DELETE FROM audit_logs WHERE new_hire_id = ?
      `, [id]);
    }
    
    // Delete the hires
    // Use parameterized queries to prevent SQL injection
    const placeholders = ids.map(() => '?').join(',');
    
    // Delete the hires
    await executeQuery(`
      DELETE FROM hires WHERE id IN (${placeholders})
    `, ids);
    
    res.status(204).end();
  } catch (error) {
    logger.api.error('Error bulk deleting hires from database:', error);
    res.status(500).json({ error: 'Failed to bulk delete hires', message: error.message });
  }
});

// Bulk update hires
router.post('/bulk-update', async (req, res) => {
  const { ids, updateData } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty IDs array' });
  }
  
  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No update data provided' });
  }
  
  // Always set ICT Support PIC from authenticated user if available
  if (req.user && req.user.username) {
    updateData.ict_support_pic = req.user.username;
    logger.api.info(`Setting ICT Support PIC to ${updateData.ict_support_pic} for bulk update`);
  } else {
    logger.api.warn('No authenticated user available for setting ICT Support PIC on bulk update');
  }

  try {
    logger.api.info(`Bulk updating ${ids.length} hires with data:`, updateData);
    
    const now = new Date().toISOString();
    
    // Build SET clause and values for SQL update
    const setClause = ['updated_at = ?'];
    const values = [now];
    
    // Process update data for SQL query
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
    
    // Use parameterized queries to prevent SQL injection
    const placeholders = ids.map(() => '?').join(',');
    
    // Complete values array with IDs for WHERE clause
    const allValues = [...values, ...ids];
    
    // Construct and execute SQL query
    const query = `
      UPDATE hires
      SET ${setClause.join(', ')}
      WHERE id IN (${placeholders})
    `;
    
    logger.api.debug("Executing bulk update query:", query);
    logger.api.debug("Update query values:", allValues);
    
    await executeQuery(query, allValues);
    
    // Create audit logs for each updated hire
    for (const id of ids) {
      const logId = generateId();
      const log = {
        id: logId,
        new_hire_id: id,
        action_type: "BULK_UPDATE",
        status: "SUCCESS",
        message: "Record updated in bulk operation",
        details: JSON.stringify(updateData),
        performed_by: req.user ? req.user.username : "system",
        timestamp: now
      };
      
      // Insert audit log
      await executeQuery(`
        INSERT INTO audit_logs (id, new_hire_id, action_type, status, message, details, performed_by, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        log.id, 
        log.new_hire_id, 
        log.action_type, 
        log.status, 
        log.message, 
        log.details, 
        log.performed_by, 
        log.timestamp
      ]);
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully updated ${ids.length} records`,
      updatedCount: ids.length
    });
    
  } catch (error) {
    logger.api.error('Error bulk updating hires in database:', error);
    res.status(500).json({ error: 'Failed to bulk update hires', message: error.message });
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
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    logger.api.info('POST /hires/import - Processing file import');
    
    if (!req.file) {
      logger.api.warn('No file uploaded');
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    const fileBuffer = req.file.buffer;
    const fileContent = fileBuffer.toString();
    
    // Get existing departments for validation
    const departments = await executeQuery('SELECT name FROM departments');
    const validDepartments = departments.map(d => d.name.toLowerCase());
    
    logger.api.info(`Found ${validDepartments.length} valid departments for validation`);
    
    const results = [];
    const errors = [];
    let rowCount = 0;
    let successCount = 0;
    
    // Parse CSV
    const parser = csv({ 
      mapHeaders: ({ header }) => header.trim().toLowerCase(),
      mapValues: ({ value }) => value ? value.trim() : value
    });
    
    // Process each row from the CSV
    const rows = [];
    let headerProcessed = false;
    
    // Create a readable stream from the buffer using the native Node.js stream module
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null); // Signal the end of the stream
    
    // Process data through the stream
    await new Promise((resolve, reject) => {
      bufferStream
        .pipe(parser)
        .on('data', (data) => {
          rowCount++;
          rows.push(data);
        })
        .on('end', resolve)
        .on('error', (error) => {
          logger.api.error('Error parsing CSV:', error);
          reject(error);
        });
    });
    
    logger.api.info(`Parsed ${rows.length} rows from CSV`);
    
    // Process each row
    for (const [index, row] of rows.entries()) {
      try {
        // Check required fields
        const requiredFields = ['name', 'title', 'department', 'email', 'direct_report'];
        const missingFields = requiredFields.filter(field => !row[field]);
        
        if (missingFields.length > 0) {
          errors.push({
            row: index + 2, // +2 because index is 0-based and we need to account for the header row
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }
        
        // Validate department
        if (row.department && !validDepartments.includes(row.department.toLowerCase())) {
          errors.push({
            row: index + 2,
            error: `Department "${row.department}" does not exist in the database`,
            data: row
          });
          continue;
        }
        
        // Generate ID and timestamps
        const id = generateId();
        const now = new Date().toISOString();
        
        // Convert boolean string values to actual booleans
        const processedRow = {
          id,
          name: row.name,
          title: row.title,
          department: row.department,
          email: row.email || null,
          direct_report: row.direct_report || null,
          phone_number: row.phone_number || null,
          mailing_list: row.mailing_list || null,
          remarks: row.remarks || null,
          account_creation_status: row.account_creation_status || 'Pending',
          license_assigned: convertToBoolean(row.license_assigned) ? 1 : 0,
          status_srf: convertToBoolean(row.status_srf) ? 1 : 0,
          username: row.username || null,
          password: row.password || null,
          on_site_date: row.on_site_date || null,
          microsoft_365_license: convertToBoolean(row.microsoft_365_license) ? 1 : 0,
          laptop_ready: row.laptop_ready || 'Pending',
          note: row.note || null,
          ict_support_pic: row.ict_support_pic || null,
          created_at: now,
          updated_at: now
        };
        
        // Build columns and values for SQL insert
        const columns = Object.keys(processedRow);
        const placeholders = Array(columns.length).fill('?');
        const values = Object.values(processedRow);
        
        // Construct and execute SQL query
        const query = `
          INSERT INTO hires (${columns.join(', ')})
          VALUES (${placeholders.join(', ')})
        `;
        
        await executeQuery(query, values);
        
        // Create an audit log for this import
        const logId = generateId();
        const log = {
          id: logId,
          new_hire_id: id,
          action_type: "IMPORT",
          status: "SUCCESS",
          message: "Record imported from CSV",
          performed_by: "system import",
          timestamp: now
        };
        
        // Insert audit log into database
        await executeQuery(`
          INSERT INTO audit_logs (id, new_hire_id, action_type, status, message, performed_by, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [log.id, log.new_hire_id, log.action_type, log.status, log.message, log.performed_by, log.timestamp]);
        
        successCount++;
        results.push({ id, name: row.name, status: 'success' });
      } catch (error) {
        logger.api.error(`Error importing row ${index + 2}:`, error);
        errors.push({
          row: index + 2,
          error: error.message,
          data: row
        });
      }
    }
    
    const response = {
      success: successCount > 0,
      message: successCount > 0 
        ? `Successfully imported ${successCount} of ${rowCount} records` 
        : 'Failed to import any records',
      rowsImported: successCount,
      totalRows: rowCount,
      errors: errors.length > 0 ? errors : undefined
    };
    
    logger.api.info(`Import completed: ${successCount} of ${rowCount} records imported successfully`);
    if (errors.length > 0) {
      logger.api.warn(`${errors.length} errors encountered during import`);
    }
    
    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    logger.api.error('Error during import:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to import hires', 
      error: error.message 
    });
  }
});

// Helper function to convert various boolean string representations to actual boolean
function convertToBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return false;
  
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'y';
}

export default router;
