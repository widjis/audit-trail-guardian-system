import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sql from 'mssql';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const config = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Encryption configuration
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

// Encryption functions
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData) {
  if (!encryptedData || !encryptedData.encrypted) return null;
  
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Database connection
let pool;

async function connectToDatabase() {
  try {
    pool = await sql.connect(config);
    console.log('[Database] Connected to MSSQL database');
    return pool;
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    throw error;
  }
}

// Create system_configurations table if it doesn't exist
async function createSystemConfigurationsTable() {
  try {
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_configurations' AND xtype='U')
      BEGIN
        CREATE TABLE system_configurations (
          id INT IDENTITY(1,1) PRIMARY KEY,
          config_key NVARCHAR(100) NOT NULL UNIQUE,
          config_name NVARCHAR(200) NOT NULL,
          config_description NVARCHAR(500),
          config_category NVARCHAR(50) NOT NULL,
          is_sensitive BIT NOT NULL DEFAULT 0,
          is_encrypted BIT NOT NULL DEFAULT 0,
          config_value NVARCHAR(MAX),
          encrypted_value NVARCHAR(MAX),
          encryption_iv NVARCHAR(100),
          encryption_auth_tag NVARCHAR(100),
          is_active BIT NOT NULL DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          created_by NVARCHAR(100) DEFAULT 'system',
          updated_by NVARCHAR(100) DEFAULT 'system'
        );
        
        CREATE INDEX IX_system_configurations_config_key ON system_configurations(config_key);
        CREATE INDEX IX_system_configurations_category ON system_configurations(config_category);
        CREATE INDEX IX_system_configurations_active ON system_configurations(is_active);
        
        PRINT 'Table system_configurations created successfully';
      END
      ELSE
      BEGIN
        PRINT 'Table system_configurations already exists';
      END
    `;
    
    await pool.request().query(query);
    console.log('[Migration] System configurations table ready');
  } catch (error) {
    console.error('[Migration] Error creating system_configurations table:', error);
    throw error;
  }
}

// Load settings from JSON file
function loadSettings() {
  try {
    const settingsPath = path.join(__dirname, '..', 'src', 'server', 'data', 'settings.json');
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(settingsData);
  } catch (error) {
    console.error('[Migration] Error loading settings.json:', error);
    throw error;
  }
}

// Insert or update configuration
async function upsertConfiguration(configKey, configName, description, category, value, isSensitive = false) {
  try {
    let configValue = null;
    let encryptedValue = null;
    let encryptionIv = null;
    let encryptionAuthTag = null;
    let isEncrypted = false;
    
    if (isSensitive && value) {
      // Encrypt sensitive data
      const encrypted = encrypt(typeof value === 'object' ? JSON.stringify(value) : value.toString());
      encryptedValue = encrypted.encrypted;
      encryptionIv = encrypted.iv;
      encryptionAuthTag = encrypted.authTag;
      isEncrypted = true;
      console.log(`[Migration] Encrypted sensitive config: ${configKey}`);
    } else {
      // Store non-sensitive data as plain text
      configValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
    }
    
    const query = `
      MERGE system_configurations AS target
      USING (SELECT @configKey AS config_key) AS source
      ON target.config_key = source.config_key
      WHEN MATCHED THEN
        UPDATE SET 
          config_name = @configName,
          config_description = @description,
          config_category = @category,
          is_sensitive = @isSensitive,
          is_encrypted = @isEncrypted,
          config_value = @configValue,
          encrypted_value = @encryptedValue,
          encryption_iv = @encryptionIv,
          encryption_auth_tag = @encryptionAuthTag,
          updated_at = GETDATE(),
          updated_by = 'migration_script'
      WHEN NOT MATCHED THEN
        INSERT (config_key, config_name, config_description, config_category, is_sensitive, is_encrypted, 
                config_value, encrypted_value, encryption_iv, encryption_auth_tag, created_by, updated_by)
        VALUES (@configKey, @configName, @description, @category, @isSensitive, @isEncrypted,
                @configValue, @encryptedValue, @encryptionIv, @encryptionAuthTag, 'migration_script', 'migration_script');
    `;
    
    await pool.request()
      .input('configKey', sql.NVarChar(100), configKey)
      .input('configName', sql.NVarChar(200), configName)
      .input('description', sql.NVarChar(500), description)
      .input('category', sql.NVarChar(50), category)
      .input('isSensitive', sql.Bit, isSensitive)
      .input('isEncrypted', sql.Bit, isEncrypted)
      .input('configValue', sql.NVarChar(sql.MAX), configValue)
      .input('encryptedValue', sql.NVarChar(sql.MAX), encryptedValue)
      .input('encryptionIv', sql.NVarChar(100), encryptionIv)
      .input('encryptionAuthTag', sql.NVarChar(100), encryptionAuthTag)
      .query(query);
    
    console.log(`[Migration] ✓ Migrated config: ${configKey}`);
  } catch (error) {
    console.error(`[Migration] Error migrating config ${configKey}:`, error);
    throw error;
  }
}

// Migrate HRIS database configuration
async function migrateHrisConfig(settings) {
  try {
    console.log('[Migration] Starting HRIS database configuration migration...');
    
    const hrisConfig = settings.hrisDbConfig;
    if (!hrisConfig) {
      console.log('[Migration] No HRIS configuration found in settings.json');
      return;
    }
    
    // Migrate individual HRIS configuration items
    await upsertConfiguration(
      'hris.server',
      'HRIS Database Server',
      'HRIS database server hostname or IP address',
      'hris_database',
      hrisConfig.server,
      false // Server hostname is not sensitive
    );
    
    await upsertConfiguration(
      'hris.port',
      'HRIS Database Port',
      'HRIS database server port number',
      'hris_database',
      hrisConfig.port,
      false
    );
    
    await upsertConfiguration(
      'hris.database',
      'HRIS Database Name',
      'HRIS database name',
      'hris_database',
      hrisConfig.database,
      false
    );
    
    await upsertConfiguration(
      'hris.username',
      'HRIS Database Username',
      'HRIS database connection username',
      'hris_database',
      hrisConfig.username,
      true // Username is sensitive
    );
    
    await upsertConfiguration(
      'hris.password',
      'HRIS Database Password',
      'HRIS database connection password',
      'hris_database',
      hrisConfig.password,
      true // Password is sensitive
    );
    
    await upsertConfiguration(
      'hris.enabled',
      'HRIS Integration Enabled',
      'Whether HRIS database integration is enabled',
      'hris_database',
      hrisConfig.enabled,
      false
    );
    
    console.log('[Migration] ✓ HRIS database configuration migrated successfully');
  } catch (error) {
    console.error('[Migration] Error migrating HRIS configuration:', error);
    throw error;
  }
}

// Main migration function
async function migrate() {
  try {
    console.log('[Migration] Starting HRIS configuration migration...');
    console.log('[Migration] Environment variables loaded from .env');
    
    // Warn about encryption key
    if (!process.env.CONFIG_ENCRYPTION_KEY) {
      console.warn('[Security] WARNING: CONFIG_ENCRYPTION_KEY not found in environment variables!');
      console.warn('[Security] A random key will be generated, but this should be set in production!');
      console.warn('[Security] Generated key:', ENCRYPTION_KEY);
      console.warn('[Security] Please add this to your .env file: CONFIG_ENCRYPTION_KEY=' + ENCRYPTION_KEY);
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Create tables
    await createSystemConfigurationsTable();
    
    // Load settings
    const settings = loadSettings();
    
    // Migrate HRIS configuration
    await migrateHrisConfig(settings);
    
    console.log('[Migration] ✅ HRIS configuration migration completed successfully!');
    console.log('[Migration] Next steps:');
    console.log('[Migration] 1. Update your application to read HRIS config from database');
    console.log('[Migration] 2. Remove HRIS config from settings.json after testing');
    console.log('[Migration] 3. Ensure CONFIG_ENCRYPTION_KEY is properly set in production');
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('[Database] Connection closed');
    }
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('migrate-hris-config.js')) {
  migrate();
}

export {
  migrate,
  encrypt,
  decrypt,
  connectToDatabase,
  createSystemConfigurationsTable,
  upsertConfiguration
};

export default {
  migrate,
  encrypt,
  decrypt,
  connectToDatabase,
  createSystemConfigurationsTable,
  upsertConfiguration
};