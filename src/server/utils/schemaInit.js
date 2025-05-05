
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery, getDbPool } from './dbConnection.js';

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
      console.warn('Schema file not found:', schemaFilePath);
      return false;
    }
    
    // Read schema file
    const schemaContent = fs.readFileSync(schemaFilePath, 'utf8');
    
    // Execute schema SQL (for MS SQL, we can execute the whole file)
    if (process.env.DB_TYPE === 'mssql') {
      const dbPool = getDbPool();
      if (!dbPool) {
        console.error('Database connection not available for schema initialization');
        return false;
      }
      
      await dbPool.request().batch(schemaContent);
      console.log('Schema initialization completed successfully');
      return true;
    } 
    else if (process.env.DB_TYPE === 'postgres') {
      // For PostgreSQL, we would need to execute each statement separately
      // This is a simplified version
      await executeQuery(schemaContent);
      console.log('Schema initialization completed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to initialize schema:', error);
    return false;
  }
};
