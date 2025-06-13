
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
      
      try {
        logger.db.info('Executing database schema...');
        await dbPool.request().batch(schemaContent);
        logger.db.info('Database schema executed successfully');
        
        // Verify that the hires table exists and has the required columns
        const tableCheck = await dbPool.request().query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME IN ('users', 'hires', 'audit_logs', 'departments', 'ms365_license_types')
        `);
        
        logger.db.info(`Found ${tableCheck.recordset.length} tables in database`);
        
        // Verify distribution list sync columns exist
        const columnCheck = await dbPool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'hires' 
          AND COLUMN_NAME IN ('distribution_list_sync_status', 'distribution_list_sync_date')
        `);
        
        if (columnCheck.recordset.length === 2) {
          logger.db.info('Distribution list sync columns verified as existing in hires table');
        } else {
          logger.db.warn('Some distribution list sync columns may be missing from hires table');
        }
        
      } catch (schemaError) {
        logger.db.error('Error executing database schema:', schemaError);
        return false;
      }
      
      logger.db.info('Schema initialization completed successfully');
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
