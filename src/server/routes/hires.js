
import express from 'express';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../utils/logger.js';
import { checkDatabaseConnection, executeQuery } from '../utils/dbConnection.js';

const router = express.Router();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the JSON file
const HIRES_FILE = path.join(__dirname, '../data/hires.json');

// Helper function to transform data for database insertion
function transformHireDataForDB(data) {
  const transformed = { ...data };
  
  // Convert mailing_list array to comma-separated string
  if (Array.isArray(transformed.mailing_list)) {
    transformed.mailing_list = transformed.mailing_list.join(', ');
  } else if (typeof transformed.mailing_list === 'string') {
    // Already a string, keep as is
    transformed.mailing_list = transformed.mailing_list;
  } else {
    // Handle null/undefined cases
    transformed.mailing_list = '';
  }
  
  // Ensure boolean fields are converted to 0/1 for SQL Server
  transformed.license_assigned = transformed.license_assigned ? 1 : 0;
  transformed.status_srf = transformed.status_srf ? 1 : 0;
  
  // Ensure empty strings for null/undefined fields
  transformed.remarks = transformed.remarks || '';
  transformed.note = transformed.note || '';
  transformed.phone_number = transformed.phone_number || '';
  transformed.direct_report = transformed.direct_report || '';
  transformed.ict_support_pic = transformed.ict_support_pic || '';
  
  logger.info('Data transformation:', {
    original_mailing_list: data.mailing_list,
    transformed_mailing_list: transformed.mailing_list,
    original_type: typeof data.mailing_list,
    transformed_type: typeof transformed.mailing_list
  });
  
  return transformed;
}

// GET /hires - Get all hires
router.get('/', async (req, res) => {
  try {
    logger.info('GET /hires - Fetching all hires');
    
    const hasDb = await checkDatabaseConnection();
    
    if (hasDb) {
      const hires = await executeQuery('SELECT * FROM hires ORDER BY created_at DESC');
      logger.info(`Fetched ${hires.length} hires from database`);
      
      // Transform boolean fields from 0/1 to true/false
      const transformedHires = hires.map(hire => ({
        ...hire,
        license_assigned: hire.license_assigned === 1,
        status_srf: hire.status_srf === 1
      }));
      
      res.json(transformedHires);
    } else {
      // Read from JSON file
      const data = await fs.readFile(HIRES_FILE, 'utf8');
      const hires = JSON.parse(data);
      logger.info(`Fetched ${hires.length} hires from file`);
      res.json(hires);
    }
  } catch (error) {
    logger.error('Error fetching hires:', error);
    res.status(500).json({ error: 'Failed to fetch hires' });
  }
});

// GET /hires/:id - Get a specific hire
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /hires/${id} - Fetching hire`);
    
    const hasDb = await checkDatabaseConnection();
    
    if (hasDb) {
      const hires = await executeQuery('SELECT * FROM hires WHERE id = ?', [id]);
      
      if (hires.length === 0) {
        logger.warn(`Hire with ID ${id} not found`);
        return res.status(404).json({ error: 'Hire not found' });
      }
      
      // Transform boolean fields from 0/1 to true/false
      const hire = {
        ...hires[0],
        license_assigned: hires[0].license_assigned === 1,
        status_srf: hires[0].status_srf === 1
      };
      
      res.json(hire);
    } else {
      // Read from JSON file
      const data = await fs.readFile(HIRES_FILE, 'utf8');
      const hires = JSON.parse(data);
      const hire = hires.find(h => h.id === id);
      
      if (!hire) {
        logger.warn(`Hire with ID ${id} not found`);
        return res.status(404).json({ error: 'Hire not found' });
      }
      
      res.json(hire);
    }
  } catch (error) {
    logger.error(`Error fetching hire ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch hire' });
  }
});

// POST /hires - Create new hire
router.post('/', async (req, res) => {
  try {
    logger.info('POST /hires - Creating new hire');
    const hireData = req.body;
    
    // Transform data for database insertion
    const transformedData = transformHireDataForDB(hireData);
    
    // Generate ID and timestamps
    const id = nanoid();
    const now = new Date().toISOString();
    
    const hire = {
      id,
      created_at: now,
      updated_at: now,
      ...transformedData
    };

    logger.info('Transformed hire data for database:', hire);

    const hasDb = await checkDatabaseConnection();
    
    if (hasDb) {
      // Insert into database
      await executeQuery(`
        INSERT INTO hires (
          id, name, title, department, email, direct_report, phone_number,
          mailing_list, remarks, account_creation_status, license_assigned,
          status_srf, username, password, on_site_date, microsoft_365_license,
          laptop_ready, note, ict_support_pic, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `, [
        hire.id, hire.name, hire.title, hire.department, hire.email, hire.direct_report, hire.phone_number,
        hire.mailing_list, hire.remarks, hire.account_creation_status, hire.license_assigned,
        hire.status_srf, hire.username, hire.password, hire.on_site_date, hire.microsoft_365_license,
        hire.laptop_ready, hire.note, hire.ict_support_pic, hire.created_at, hire.updated_at
      ]);
      
      logger.info(`Hire created with ID: ${id}`);
      res.status(201).json(hire);
    } else {
      // Save to JSON file
      const data = await fs.readFile(HIRES_FILE, 'utf8');
      const hires = JSON.parse(data);
      hires.push(hire);
      await fs.writeFile(HIRES_FILE, JSON.stringify(hires, null, 2));
      
      logger.info(`Hire created with ID: ${id}`);
      res.status(201).json(hire);
    }
  } catch (error) {
    logger.error('Error creating hire:', error);
    res.status(500).json({ error: 'Failed to create hire' });
  }
});

// PUT /hires/:id - Update hire
router.put('/:id', async (req, res) => {
  try {
    logger.info(`PUT /hires/${req.params.id} - Updating hire`);
    const { id } = req.params;
    const updateData = req.body;
    
    // Transform data for database insertion
    const transformedData = transformHireDataForDB(updateData);
    
    const updatedHire = {
      ...transformedData,
      updated_at: new Date().toISOString()
    };

    logger.info('Transformed update data for database:', updatedHire);

    const hasDb = await checkDatabaseConnection();
    
    if (hasDb) {
      // Check if hire exists
      const checkResult = await executeQuery('SELECT * FROM hires WHERE id = ?', [id]);
      
      if (checkResult.length === 0) {
        logger.warn(`Hire with ID ${id} not found for update`);
        return res.status(404).json({ error: 'Hire not found' });
      }
      
      // Update in database
      await executeQuery(`
        UPDATE hires
        SET
          name = ?, title = ?, department = ?, email = ?, direct_report = ?, phone_number = ?,
          mailing_list = ?, remarks = ?, account_creation_status = ?, license_assigned = ?,
          status_srf = ?, username = ?, password = ?, on_site_date = ?, microsoft_365_license = ?,
          laptop_ready = ?, note = ?, ict_support_pic = ?, updated_at = ?
        WHERE id = ?
      `, [
        updatedHire.name, updatedHire.title, updatedHire.department, updatedHire.email, 
        updatedHire.direct_report, updatedHire.phone_number, updatedHire.mailing_list, 
        updatedHire.remarks, updatedHire.account_creation_status, updatedHire.license_assigned,
        updatedHire.status_srf, updatedHire.username, updatedHire.password, 
        updatedHire.on_site_date, updatedHire.microsoft_365_license, updatedHire.laptop_ready, 
        updatedHire.note, updatedHire.ict_support_pic, updatedHire.updated_at, id
      ]);
      
      // Get the updated hire
      const result = await executeQuery('SELECT * FROM hires WHERE id = ?', [id]);
      
      // Transform boolean fields from 0/1 to true/false
      const hire = {
        ...result[0],
        license_assigned: result[0].license_assigned === 1,
        status_srf: result[0].status_srf === 1
      };
      
      logger.info(`Hire updated with ID: ${id}`);
      res.json(hire);
    } else {
      // Update in JSON file
      const data = await fs.readFile(HIRES_FILE, 'utf8');
      let hires = JSON.parse(data);
      
      const index = hires.findIndex(h => h.id === id);
      if (index === -1) {
        logger.warn(`Hire with ID ${id} not found for update`);
        return res.status(404).json({ error: 'Hire not found' });
      }
      
      hires[index] = { ...hires[index], ...updatedHire };
      await fs.writeFile(HIRES_FILE, JSON.stringify(hires, null, 2));
      
      logger.info(`Hire updated with ID: ${id}`);
      res.json(hires[index]);
    }
  } catch (error) {
    logger.error(`Error updating hire ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update hire' });
  }
});

// DELETE /hires/:id - Delete a hire
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`DELETE /hires/${id} - Deleting hire`);
    
    const hasDb = await checkDatabaseConnection();
    
    if (hasDb) {
      // Check if hire exists
      const checkResult = await executeQuery('SELECT * FROM hires WHERE id = ?', [id]);
      
      if (checkResult.length === 0) {
        logger.warn(`Hire with ID ${id} not found for deletion`);
        return res.status(404).json({ error: 'Hire not found' });
      }
      
      // Delete from database
      await executeQuery('DELETE FROM hires WHERE id = ?', [id]);
      
      logger.info(`Hire deleted with ID: ${id}`);
      res.json({ message: 'Hire deleted successfully' });
    } else {
      // Delete from JSON file
      const data = await fs.readFile(HIRES_FILE, 'utf8');
      let hires = JSON.parse(data);
      
      const index = hires.findIndex(h => h.id === id);
      if (index === -1) {
        logger.warn(`Hire with ID ${id} not found for deletion`);
        return res.status(404).json({ error: 'Hire not found' });
      }
      
      hires.splice(index, 1);
      await fs.writeFile(HIRES_FILE, JSON.stringify(hires, null, 2));
      
      logger.info(`Hire deleted with ID: ${id}`);
      res.json({ message: 'Hire deleted successfully' });
    }
  } catch (error) {
    logger.error(`Error deleting hire ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete hire' });
  }
});

export default router;
