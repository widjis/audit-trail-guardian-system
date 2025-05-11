
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from './dbConnection.js';
import logger from './logger.js';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initMS365Schema() {
  try {
    logger.db.info('Initializing MS365 license types schema...');
    
    // Read schema SQL file
    const schemaFilePath = path.join(__dirname, '../data/ms365_schema.sql');
    const schemaSql = fs.readFileSync(schemaFilePath, 'utf8');
    
    // Split SQL statements by semicolons followed by newline or end of file
    // This approach handles T-SQL statements that may contain multiple statements
    const statements = schemaSql
      .replace(/\r\n/g, '\n') // Normalize line endings
      .split(/;\s*\n|;\s*$/)  // Split by semicolon followed by newline or end of file
      .filter(statement => statement.trim().length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      logger.db.debug('Executing SQL statement:', statement.substring(0, 100) + '...');
      await executeQuery(statement);
    }
    
    logger.db.info('MS365 license types schema initialization completed successfully');
    return true;
  } catch (error) {
    logger.db.error('Failed to initialize MS365 license types schema:', error);
    return false;
  }
}
