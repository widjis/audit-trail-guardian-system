
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const router     = express.Router();

// Only load a local `.env` file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../../.env') });
}

// Where to save schema (unchanged)
const SCHEMA_FILE_PATH = path.join(__dirname, '../data/dbSchema.sql');

// Default database config keys (for .env.example generation)
const DB_CONFIG_KEYS = [
  'DB_TYPE',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_INSTANCE',
  'DB_ENCRYPT',
];

//
// ─── GET CURRENT DB CONFIG ─────────────────────────────────────────────────────
//
router.get('/', (_req, res) => {
  try {
    const cfg = {
      type:     process.env.DB_TYPE     || '',
      host:     process.env.DB_HOST     || '',
      port:     process.env.DB_PORT     || '',
      database: process.env.DB_NAME     || '',
      username: process.env.DB_USER     || '',
      password: process.env.DB_PASSWORD || '',
      instance: process.env.DB_INSTANCE || '',
      encrypt:  process.env.DB_ENCRYPT === 'true',
    };
    res.json(cfg);
  } catch (err) {
    console.error('Error reading DB config:', err);
    res.status(500).json({ error: 'Failed to read DB configuration' });
  }
});

//
// ─── UPDATE DB CONFIG (writes to .env) ─────────────────────────────────────────
//
router.put('/', (req, res) => {
  try {
    // Gather new values from request
    const {
      type, host, port, database, username,
      password, instance, encrypt,
    } = req.body;

    // Build new env object, preserving any existing keys in a local .env
    const envPath = path.join(__dirname, '../../../.env');
    let envConfig = {};
    if (fs.existsSync(envPath)) {
      envConfig = dotenv.parse(fs.readFileSync(envPath));
    }

    // Overwrite with new values
    envConfig.DB_TYPE     = type;
    envConfig.DB_HOST     = host;
    envConfig.DB_PORT     = port;
    envConfig.DB_NAME     = database;
    envConfig.DB_USER     = username;
    envConfig.DB_PASSWORD = password;

    if (type === 'mssql') {
      envConfig.DB_INSTANCE = instance || '';
      envConfig.DB_ENCRYPT  = encrypt ? 'true' : 'false';
    }

    // Serialize back to file
    const out = Object.entries(envConfig)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    fs.writeFileSync(envPath, out);

    // Ensure .env.example exists
    const examplePath = path.join(__dirname, '../../../.env.example');
    if (!fs.existsSync(examplePath)) {
      const example = DB_CONFIG_KEYS.map(k => `${k}=`).join('\n');
      fs.writeFileSync(examplePath, example);
    }

    res.json({ success: true, message: 'Database configuration updated' });
  } catch (err) {
    console.error('Error writing DB config:', err);
    res.status(500).json({ error: 'Failed to update DB configuration' });
  }
});

//
// ─── TEST DB CONNECTION ─────────────────────────────────────────────────────────
//
router.post('/test-connection', async (req, res) => {
  const { type, host, port, database, username, password, instance, encrypt } = req.body;
  let connected = false, errorMsg = null;

  try {
    if (type === 'postgres') {
      const { Pool } = await import('pg');
      const pool = new Pool({
        host, port: +port, database, user: username,
        password, connectionTimeoutMillis: 5000,
      });
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      connected = true;

    } else if (type === 'mssql') {
      const mssql = await import('mssql');
      let server = host;
      if (instance) server = `${host}\\${instance}`;
      await new mssql.default.ConnectionPool({
        server, port: +port,
        database, user: username, password,
        options: { encrypt, trustServerCertificate: true, connectTimeout: 5000 },
      }).connect();
      connected = true;
    }
  } catch (err) {
    console.error('DB connection test failed:', err);
    errorMsg = err.message;
  }

  if (connected) {
    return res.json({ success: true, message: 'Connection successful!' });
  }
  return res.status(400).json({ success: false, message: 'Connection failed', error: errorMsg });
});

//
// ─── GET DB SCHEMA ────────────────────────────────────────────────────────────────
//
router.get('/schema', (_req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const schema = fs.existsSync(SCHEMA_FILE_PATH)
      ? fs.readFileSync(SCHEMA_FILE_PATH, 'utf8')
      : '';
    res.json({ schema });
  } catch (err) {
    console.error('Error reading schema:', err);
    res.status(500).json({ error: 'Failed to read schema' });
  }
});

//
// ─── UPDATE DB SCHEMA ─────────────────────────────────────────────────────────────
//
router.put('/schema', (req, res) => {
  try {
    const { schema } = req.body;
    if (!schema) {
      return res.status(400).json({ error: 'Schema is required' });
    }

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(SCHEMA_FILE_PATH, schema, 'utf8');
    res.json({ success: true, message: 'Schema updated', filePath: SCHEMA_FILE_PATH });
  } catch (err) {
    console.error('Error writing schema:', err);
    res.status(500).json({ error: 'Failed to update schema' });
  }
});

export default router;


// import express from 'express';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import dotenv from 'dotenv';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const router = express.Router();

// // Path to store database config (separate from .env for security)
// const ENV_FILE_PATH = path.join(__dirname, '../../../.env');
// const ENV_EXAMPLE_PATH = path.join(__dirname, '../../../.env.example');
// const SCHEMA_FILE_PATH = path.join(__dirname, '../data/dbSchema.sql');

// // Default database config keys
// const DB_CONFIG_KEYS = [
//   'DB_TYPE',
//   'DB_HOST',
//   'DB_PORT',
//   'DB_NAME',
//   'DB_USER',
//   'DB_PASSWORD',
//   'DB_INSTANCE', // For MS SQL Server
//   'DB_ENCRYPT'   // For MS SQL Server
// ];

// // Parse .env file if exists
// const getEnvConfig = () => {
//   if (fs.existsSync(ENV_FILE_PATH)) {
//     return dotenv.parse(fs.readFileSync(ENV_FILE_PATH));
//   }
//   return {};
// };

// // Get database configuration
// router.get('/', (req, res) => {
//   try {
//     const envConfig = getEnvConfig();
    
//     const dbConfig = {
//       type: envConfig.DB_TYPE || 'postgres',
//       host: envConfig.DB_HOST || '',
//       port: envConfig.DB_PORT || (envConfig.DB_TYPE === 'mssql' ? '1433' : '5432'),
//       database: envConfig.DB_NAME || '',
//       username: envConfig.DB_USER || '',
//       password: envConfig.DB_PASSWORD || '',
//       instance: envConfig.DB_INSTANCE || '',
//       encrypt: envConfig.DB_ENCRYPT === 'true'
//     };
    
//     res.json(dbConfig);
//   } catch (error) {
//     console.error('Error getting database config:', error);
//     res.status(500).json({ error: 'Failed to get database configuration' });
//   }
// });

// // Update database configuration
// router.put('/', (req, res) => {
//   try {
//     const { type, host, port, database, username, password, instance, encrypt } = req.body;
    
//     // Read existing env file content or create empty object
//     let envConfig = getEnvConfig();
    
//     // Update database config values
//     envConfig = {
//       ...envConfig,
//       DB_TYPE: type,
//       DB_HOST: host,
//       DB_PORT: port,
//       DB_NAME: database,
//       DB_USER: username,
//       DB_PASSWORD: password
//     };
    
//     // Add MS SQL specific configs if needed
//     if (type === 'mssql') {
//       envConfig.DB_INSTANCE = instance || '';
//       envConfig.DB_ENCRYPT = encrypt ? 'true' : 'false';
//     }
    
//     // Convert to env file format
//     const envContent = Object.entries(envConfig)
//       .map(([key, value]) => `${key}=${value}`)
//       .join('\n');
    
//     // Write to .env file
//     fs.writeFileSync(ENV_FILE_PATH, envContent);
    
//     // Create .env.example if doesn't exist
//     if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
//       const exampleContent = DB_CONFIG_KEYS
//         .map(key => `${key}=`)
//         .join('\n');
//       fs.writeFileSync(ENV_EXAMPLE_PATH, exampleContent);
//     }
    
//     res.json({ success: true, message: 'Database configuration updated successfully' });
//   } catch (error) {
//     console.error('Error updating database config:', error);
//     res.status(500).json({ error: 'Failed to update database configuration' });
//   }
// });

// // Test database connection
// router.post('/test-connection', async (req, res) => {
//   try {
//     const { type, host, port, database, username, password, instance, encrypt } = req.body;
    
//     // Dynamic import of database drivers
//     let connected = false;
//     let error = null;
    
//     try {
//       if (type === 'postgres') {
//         const { Pool } = await import('pg');
        
//         const pool = new Pool({
//           host,
//           port: parseInt(port),
//           database,
//           user: username,
//           password,
//           // Short connection timeout for testing
//           connectionTimeoutMillis: 5000,
//         });
        
//         // Test the connection
//         const client = await pool.connect();
//         await client.query('SELECT 1');
//         client.release();
//         connected = true;
//       } 
//       else if (type === 'mssql') {
//         // Import mssql as a namespace object
//         const mssql = await import('mssql');
        
//         // Build connection string based on whether instance is provided
//         let server = host;
//         if (instance) {
//           server = `${host}\\${instance}`;
//         }
        
//         // Create a new connection using config
//         const config = {
//           server,
//           port: parseInt(port),
//           database,
//           user: username,
//           password,
//           options: {
//             encrypt: encrypt,
//             trustServerCertificate: true,
//             connectTimeout: 5000
//           }
//         };
        
//         // Use the mssql directly
//         await new mssql.default.ConnectionPool(config).connect();
//         connected = true;
//       }
//     } catch (err) {
//       console.error('Database connection test failed:', err);
//       error = err.message || 'Unknown error occurred';
//     }
    
//     if (connected) {
//       res.json({ success: true, message: 'Database connection successful!' });
//     } else {
//       res.status(400).json({ 
//         success: false, 
//         message: 'Database connection failed', 
//         error
//       });
//     }
//   } catch (error) {
//     console.error('Error testing database connection:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Error testing database connection', 
//       error: error.message 
//     });
//   }
// });

// // Get database schema
// router.get('/schema', (req, res) => {
//   try {
//     // Create data directory if it doesn't exist
//     const dataDir = path.join(__dirname, '../data');
//     if (!fs.existsSync(dataDir)) {
//       fs.mkdirSync(dataDir, { recursive: true });
//     }
    
//     if (fs.existsSync(SCHEMA_FILE_PATH)) {
//       const schema = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
//       res.json({ schema });
//     } else {
//       // Return empty schema instead of 404 error
//       res.json({ schema: '' });
//     }
//   } catch (error) {
//     console.error('Error getting database schema:', error);
//     res.status(500).json({ error: 'Failed to get database schema' });
//   }
// });

// // Update database schema
// router.put('/schema', (req, res) => {
//   try {
//     const { schema } = req.body;
    
//     if (!schema) {
//       return res.status(400).json({ error: 'Schema content is required' });
//     }
    
//     // Ensure the data directory exists
//     const dataDir = path.join(__dirname, '../data');
//     if (!fs.existsSync(dataDir)) {
//       fs.mkdirSync(dataDir, { recursive: true });
//     }
    
//     // Write schema to file
//     fs.writeFileSync(SCHEMA_FILE_PATH, schema, 'utf8');
    
//     res.json({ 
//       success: true, 
//       message: 'Database schema updated successfully',
//       filePath: SCHEMA_FILE_PATH
//     });
//   } catch (error) {
//     console.error('Error updating database schema:', error);
//     res.status(500).json({ error: 'Failed to update database schema' });
//   }
// });

// export default router;
