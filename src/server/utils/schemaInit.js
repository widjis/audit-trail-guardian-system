

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbPool } from './dbConnection.js';
import logger from './logger.js';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the database schema
 */
export const initializeSchema = async () => {
  try {
    const schemaFilePath = path.join(__dirname, '../data/dbSchema.sql');
    
    // Check if schema file exists
    if (!fs.existsSync(schemaFilePath)) {
      logger.db.warn('Schema file not found:', schemaFilePath);
      return false;
    }
    
    // Read schema file
    const schemaContent = fs.readFileSync(schemaFilePath, 'utf8');
    
    // Execute schema SQL
    if (process.env.DB_TYPE === 'mssql') {
      const dbPool = getDbPool();
      if (!dbPool) {
        logger.db.error('Database connection not available for schema initialization');
        return false;
      }
      
      // Split the schema into logical sections based on table creation
      const sections = [
        // Users table section
        schemaContent.substring(
          schemaContent.indexOf('-- Check if the users table already exists'),
          schemaContent.indexOf('-- Check if the departments table already exists')
        ),
        // Departments table section
        schemaContent.substring(
          schemaContent.indexOf('-- Check if the departments table already exists'),
          schemaContent.indexOf('-- Check if the hires table already exists')
        ),
        // Hires table section
        schemaContent.substring(
          schemaContent.indexOf('-- Check if the hires table already exists'),
          schemaContent.indexOf('-- Check if position_grade column exists')
        ),
        // Position grade migration section
        schemaContent.substring(
          schemaContent.indexOf('-- Check if position_grade column exists'),
          schemaContent.indexOf('-- Check if the audit_logs table already exists')
        ),
        // Audit logs table section
        schemaContent.substring(
          schemaContent.indexOf('-- Check if the audit_logs table already exists')
        )
      ];
      
      // Execute each section separately with better error handling
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (section) {
          try {
            logger.db.info(`Executing schema section ${i + 1}...`);
            await dbPool.request().batch(section);
            logger.db.info(`Schema section ${i + 1} executed successfully`);
          } catch (sectionError) {
            logger.db.error(`Error executing schema section ${i + 1}:`, sectionError);
            
            // Continue with remaining sections even if one fails
            logger.db.warn(`Continuing with remaining sections despite error in section ${i + 1}`);
          }
        }
      }
      
      // Verify position_grade column exists
      try {
        const columnCheck = await dbPool.request().query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'hires' AND COLUMN_NAME = 'position_grade'
        `);
        
        if (columnCheck.recordset.length > 0) {
          logger.db.info('Position_grade column verified as existing in hires table');
        } else {
          logger.db.warn('Position_grade column not found in hires table');
        }
      } catch (verifyError) {
        logger.db.error('Error verifying position_grade column:', verifyError);
      }
      
      logger.db.info('Schema initialization completed');
      return true;
    } 
    else if (process.env.DB_TYPE === 'postgres') {
      // For PostgreSQL, execute the whole schema at once
      const dbPool = getDbPool();
      if (!dbPool) {
        logger.db.error('Database connection not available for schema initialization');
        return false;
      }
      
      await dbPool.query(schemaContent);
      logger.db.info('Schema initialization completed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.db.error('Failed to initialize schema:', error);
    return false;
  }
};

