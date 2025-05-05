
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to store database config (separate from .env for security)
const ENV_FILE_PATH = path.join(__dirname, '../../../.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '../../../.env.example');
const SCHEMA_FILE_PATH = path.join(__dirname, '../data/dbSchema.sql');

// Default database config keys
const DB_CONFIG_KEYS = [
  'DB_TYPE',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_INSTANCE', // For MS SQL Server
  'DB_ENCRYPT'   // For MS SQL Server
];

// Parse .env file if exists
const getEnvConfig = () => {
  if (fs.existsSync(ENV_FILE_PATH)) {
    return dotenv.parse(fs.readFileSync(ENV_FILE_PATH));
  }
  return {};
};

// Get database configuration
router.get('/', (req, res) => {
  try {
    const envConfig = getEnvConfig();
    
    const dbConfig = {
      type: envConfig.DB_TYPE || 'postgres',
      host: envConfig.DB_HOST || '',
      port: envConfig.DB_PORT || (envConfig.DB_TYPE === 'mssql' ? '1433' : '5432'),
      database: envConfig.DB_NAME || '',
      username: envConfig.DB_USER || '',
      password: envConfig.DB_PASSWORD || '',
      instance: envConfig.DB_INSTANCE || '',
      encrypt: envConfig.DB_ENCRYPT === 'true'
    };
    
    res.json(dbConfig);
  } catch (error) {
    console.error('Error getting database config:', error);
    res.status(500).json({ error: 'Failed to get database configuration' });
  }
});

// Update database configuration
router.put('/', (req, res) => {
  try {
    const { type, host, port, database, username, password, instance, encrypt } = req.body;
    
    // Read existing env file content or create empty object
    let envConfig = getEnvConfig();
    
    // Update database config values
    envConfig = {
      ...envConfig,
      DB_TYPE: type,
      DB_HOST: host,
      DB_PORT: port,
      DB_NAME: database,
      DB_USER: username,
      DB_PASSWORD: password
    };
    
    // Add MS SQL specific configs if needed
    if (type === 'mssql') {
      envConfig.DB_INSTANCE = instance || '';
      envConfig.DB_ENCRYPT = encrypt ? 'true' : 'false';
    }
    
    // Convert to env file format
    const envContent = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Write to .env file
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    
    // Create .env.example if doesn't exist
    if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
      const exampleContent = DB_CONFIG_KEYS
        .map(key => `${key}=`)
        .join('\n');
      fs.writeFileSync(ENV_EXAMPLE_PATH, exampleContent);
    }
    
    res.json({ success: true, message: 'Database configuration updated successfully' });
  } catch (error) {
    console.error('Error updating database config:', error);
    res.status(500).json({ error: 'Failed to update database configuration' });
  }
});

// Test database connection
router.post('/test-connection', async (req, res) => {
  try {
    const { type, host, port, database, username, password, instance, encrypt } = req.body;
    
    // Dynamic import of database drivers
    let connected = false;
    let error = null;
    
    try {
      if (type === 'postgres') {
        const { Pool } = await import('pg');
        
        const pool = new Pool({
          host,
          port: parseInt(port),
          database,
          user: username,
          password,
          // Short connection timeout for testing
          connectionTimeoutMillis: 5000,
        });
        
        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        connected = true;
      } 
      else if (type === 'mssql') {
        // Import mssql as a namespace object
        const mssql = await import('mssql');
        
        // Build connection string based on whether instance is provided
        let server = host;
        if (instance) {
          server = `${host}\\${instance}`;
        }
        
        // Create a new connection using config
        const config = {
          server,
          port: parseInt(port),
          database,
          user: username,
          password,
          options: {
            encrypt: encrypt,
            trustServerCertificate: true,
            connectTimeout: 5000
          }
        };
        
        // Use the mssql directly
        await new mssql.default.ConnectionPool(config).connect();
        connected = true;
      }
    } catch (err) {
      console.error('Database connection test failed:', err);
      error = err.message || 'Unknown error occurred';
    }
    
    if (connected) {
      res.json({ success: true, message: 'Database connection successful!' });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Database connection failed', 
        error
      });
    }
  } catch (error) {
    console.error('Error testing database connection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error testing database connection', 
      error: error.message 
    });
  }
});

// Get database schema
router.get('/schema', (req, res) => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (fs.existsSync(SCHEMA_FILE_PATH)) {
      const schema = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
      res.json({ schema });
    } else {
      // Return empty schema instead of 404 error
      res.json({ schema: '' });
    }
  } catch (error) {
    console.error('Error getting database schema:', error);
    res.status(500).json({ error: 'Failed to get database schema' });
  }
});

// Update database schema
router.put('/schema', (req, res) => {
  try {
    const { schema } = req.body;
    
    if (!schema) {
      return res.status(400).json({ error: 'Schema content is required' });
    }
    
    // Ensure the data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write schema to file
    fs.writeFileSync(SCHEMA_FILE_PATH, schema, 'utf8');
    
    res.json({ 
      success: true, 
      message: 'Database schema updated successfully',
      filePath: SCHEMA_FILE_PATH
    });
  } catch (error) {
    console.error('Error updating database schema:', error);
    res.status(500).json({ error: 'Failed to update database schema' });
  }
});

export default router;
