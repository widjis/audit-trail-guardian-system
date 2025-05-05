
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

// Default database config keys
const DB_CONFIG_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
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
      host: envConfig.DB_HOST || '',
      port: envConfig.DB_PORT || '5432',
      database: envConfig.DB_NAME || '',
      username: envConfig.DB_USER || '',
      password: envConfig.DB_PASSWORD || ''
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
    const { host, port, database, username, password } = req.body;
    
    // Read existing env file content or create empty object
    let envConfig = getEnvConfig();
    
    // Update database config values
    envConfig = {
      ...envConfig,
      DB_HOST: host,
      DB_PORT: port,
      DB_NAME: database,
      DB_USER: username,
      DB_PASSWORD: password
    };
    
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

export default router;
