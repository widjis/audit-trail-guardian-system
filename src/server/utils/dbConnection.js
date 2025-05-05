
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
    console.log('[Database] Initializing database connection...');
    console.log(`[Database] Using database type: ${dbType}`);

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
      console.log('[Database] PostgreSQL connection pool initialized');
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
      
      // Log the connection configuration (excluding password)
      const logConfig = {
        ...config,
        password: '********' // Hide actual password
      };
      console.log('[Database] Attempting MSSQL connection with config:', JSON.stringify(logConfig));
      
      try {
        dbPool = await new mssql.default.ConnectionPool(config).connect();
        console.log('[Database] MSSQL connection pool successfully initialized');
      } catch (err) {
        console.error('[Database] MSSQL connection failed:', err);
        throw err;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[Database] Failed to initialize database connection:', error);
    return false;
  }
};

/**
 * Get the database connection pool
 */
export const getDbPool = () => {
  if (!dbPool) {
    console.warn('[Database] Database pool not initialized yet, attempting to initialize');
    initDbConnection();
  }
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
    console.log('[Database] Database pool not initialized, attempting to connect...');
    const connected = await initDbConnection();
    if (!connected) {
      throw new Error('Database connection not available');
    }
  }
  
  try {
    console.log(`[Database] Executing query: ${query}`);
    console.log(`[Database] With params:`, JSON.stringify(params));
    
    if (dbType === 'postgres') {
      console.time('[Database] Query execution time');
      const result = await dbPool.query(query, params);
      console.timeEnd('[Database] Query execution time');
      console.log(`[Database] Query executed successfully, returned ${result.rows.length} rows`);
      return result.rows;
    } else if (dbType === 'mssql') {
      const request = dbPool.request();
      
      // Add parameters to the request
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          const paramValue = param === undefined ? null : param;
          console.log(`[Database] Setting parameter param${index} =`, 
            typeof paramValue === 'object' ? JSON.stringify(paramValue) : paramValue);
          request.input(`param${index}`, paramValue);
        });
        
        // Replace ? placeholders with @paramX
        let parsedQuery = query;
        let paramIndex = 0;
        parsedQuery = parsedQuery.replace(/\?/g, () => `@param${paramIndex++}`);
        
        query = parsedQuery;
      }
      
      console.log('[Database] Final SQL query:', query);
      console.time('[Database] Query execution time');
      
      let result;
      try {
        result = await request.query(query);
        console.timeEnd('[Database] Query execution time');
        
        const rowCount = result.recordset ? result.recordset.length : 0;
        console.log(`[Database] Query executed successfully, returned ${rowCount} rows`);
        
        if (rowCount > 0 && rowCount <= 3) {
          console.log('[Database] Sample of returned data:', JSON.stringify(result.recordset.slice(0, 3)));
        }
        
        return result.recordset;
      } catch (err) {
        console.error('[Database] SQL query execution error:', err);
        console.error('[Database] Error SQL state:', err.code);
        console.error('[Database] Error SQL number:', err.number);
        console.error('[Database] Error line number:', err.lineNumber);
        throw err;
      }
    }
  } catch (error) {
    console.error('[Database] Database query execution error:', error);
    console.error('[Database] Query that failed:', query);
    console.error('[Database] Parameters:', JSON.stringify(params));
    throw error;
  }
};

// Initialize connection on module load
initDbConnection().catch(err => {
  console.error('[Database] Failed to initialize database on startup:', err);
});
