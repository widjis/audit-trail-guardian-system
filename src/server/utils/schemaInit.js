
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
      
      // Split the schema into logical sections to avoid batch validation issues
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
          schemaContent.indexOf('-- Check if the audit_logs table already exists')
        ),
        // Audit logs table section
        schemaContent.substring(
          schemaContent.indexOf('-- Check if the audit_logs table already exists')
        )
      ];
      
      // Execute each section separately
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (section) {
          try {
            logger.db.info(`Executing schema section ${i + 1}...`);
            
            // Special handling for hires table section to fix position_grade issue
            if (i === 2) { // Hires table section
              // Execute the hires table creation/check first
              const hiresTablePart = section.substring(0, section.indexOf('-- Check if position_grade column exists'));
              if (hiresTablePart.trim()) {
                await dbPool.request().batch(hiresTablePart);
                logger.db.info('Hires table section executed');
              }
              
              // Then handle position_grade column separately with dynamic SQL
              const positionGradePart = section.substring(section.indexOf('-- Check if position_grade column exists'));
              if (positionGradePart.trim()) {
                // Replace the problematic UPDATE with dynamic SQL
                const dynamicSql = positionGradePart.replace(
                  'UPDATE hires SET position_grade = \'Staff\' WHERE position_grade IS NULL;',
                  'EXEC(\'UPDATE hires SET position_grade = \'\'Staff\'\' WHERE position_grade IS NULL\');'
                );
                await dbPool.request().batch(dynamicSql);
                logger.db.info('Position grade column section executed');
              }
            } else {
              await dbPool.request().batch(section);
              logger.db.info(`Schema section ${i + 1} executed successfully`);
            }
          } catch (sectionError) {
            logger.db.error(`Error executing schema section ${i + 1}:`, sectionError);
            // Continue with other sections even if one fails
          }
        }
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
