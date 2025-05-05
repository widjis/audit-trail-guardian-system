
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const ENV_FILE_PATH = path.join(__dirname, '../../../.env');
if (fs.existsSync(ENV_FILE_PATH)) {
  dotenv.config({ path: ENV_FILE_PATH });
}

// Database connection pool
let dbPool = null;

// Get database type from environment
const dbType = process.env.DB_TYPE || 'mssql';

/**
 * Initialize database connection pool
 */
export const initDbConnection = async () => {
  try {
    // Based on the database type, initialize the appropriate connection
    if (dbType === 'postgres') {
      const { Pool } = await import('pg');
      dbPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });
      console.log('PostgreSQL connection pool initialized');
    } else if (dbType === 'mssql') {
      const mssql = await import('mssql');
      
      // Build server string based on whether instance is provided
      let server = process.env.DB_HOST;
      if (process.env.DB_INSTANCE) {
        server = `${process.env.DB_HOST}\\${process.env.DB_INSTANCE}`;
      }
      
      const config = {
        server,
        port: parseInt(process.env.DB_PORT || '1433'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: true,
          enableArithAbort: true
        }
      };
      
      dbPool = await new mssql.default.ConnectionPool(config).connect();
      console.log('MSSQL connection pool initialized');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    return false;
  }
};

/**
 * Get the database connection pool
 */
export const getDbPool = () => {
  return dbPool;
};

/**
 * Execute a query and return the result
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {Promise<any>} - Query result
 */
export const executeQuery = async (query, params = []) => {
  if (!dbPool) {
    const connected = await initDbConnection();
    if (!connected) {
      throw new Error('Database connection not available');
    }
  }
  
  try {
    if (dbType === 'postgres') {
      const result = await dbPool.query(query, params);
      return result.rows;
    } else if (dbType === 'mssql') {
      const request = dbPool.request();
      
      // Add parameters to the request
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
        
        // Replace ? placeholders with @paramX
        let parsedQuery = query;
        let paramIndex = 0;
        parsedQuery = parsedQuery.replace(/\?/g, () => `@param${paramIndex++}`);
        
        query = parsedQuery;
      }
      
      const result = await request.query(query);
      return result.recordset;
    }
  } catch (error) {
    console.error('Database query execution error:', error);
    throw error;
  }
};

// Initialize connection on module load
initDbConnection().catch(err => {
  console.error('Failed to initialize database on startup:', err);
});
