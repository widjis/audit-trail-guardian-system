
import sql from 'mssql';
import pg from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

let pool = null;
let USE_DATABASE = false;

// Check if database configuration exists
const hasDbConfig = () => {
  const dbType = process.env.DB_TYPE;
  const dbHost = process.env.DB_HOST;
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  
  return dbType && dbHost && dbName && dbUser;
};

// Initialize database connection
const initDatabase = async () => {
  if (!hasDbConfig()) {
    logger.info('Database configuration not found, using file-based storage');
    USE_DATABASE = false;
    return null;
  }

  const dbType = process.env.DB_TYPE;
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbInstance = process.env.DB_INSTANCE;
  const dbEncrypt = process.env.DB_ENCRYPT === 'true';

  try {
    if (dbType === 'mssql') {
      let server = dbHost;
      if (dbInstance) {
        server = `${dbHost}\\${dbInstance}`;
      }

      const config = {
        server,
        port: parseInt(dbPort) || 1433,
        database: dbName,
        user: dbUser,
        password: dbPassword,
        options: {
          encrypt: dbEncrypt,
          trustServerCertificate: true,
          enableArithAbort: true
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      };

      pool = new sql.ConnectionPool(config);
      await pool.connect();
      logger.info('Connected to MS SQL Server database');
      USE_DATABASE = true;

    } else if (dbType === 'postgres') {
      const { Pool } = pg;
      
      pool = new Pool({
        host: dbHost,
        port: parseInt(dbPort) || 5432,
        database: dbName,
        user: dbUser,
        password: dbPassword,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info('Connected to PostgreSQL database');
      USE_DATABASE = true;

    } else {
      logger.warn(`Unsupported database type: ${dbType}`);
      USE_DATABASE = false;
    }

  } catch (error) {
    logger.error('Database connection failed:', error);
    USE_DATABASE = false;
    pool = null;
  }

  return pool;
};

// Enhanced query method with better error handling
const query = async (text, params = {}) => {
  if (!pool || !USE_DATABASE) {
    throw new Error('Database not connected');
  }

  const dbType = process.env.DB_TYPE;
  
  try {
    if (dbType === 'mssql') {
      const request = pool.request();
      
      // Add parameters to the request
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
      
      const result = await request.query(text);
      return result;
    } else if (dbType === 'postgres') {
      // Convert named parameters to positional for PostgreSQL
      const values = Object.values(params);
      let queryText = text;
      let paramIndex = 1;
      
      Object.keys(params).forEach(key => {
        queryText = queryText.replace(new RegExp(`@${key}`, 'g'), `$${paramIndex++}`);
      });
      
      const result = await pool.query(queryText, values);
      return { recordset: result.rows };
    }
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

// Override the pool.query method to use our enhanced query
if (pool) {
  pool.query = query;
}

export { pool, USE_DATABASE, initDatabase };
