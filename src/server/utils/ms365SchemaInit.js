
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
    
    // Split SQL statements by semicolons
    const statements = schemaSql
      .split(';')
      .filter(statement => statement.trim().length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      await executeQuery(statement);
    }
    
    logger.db.info('MS365 license types schema initialization completed successfully');
    return true;
  } catch (error) {
    logger.db.error('Failed to initialize MS365 license types schema:', error);
    return false;
  }
}
