import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sql from 'mssql';
import crypto from 'crypto';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const ENV_FILE_PATH = path.join(__dirname, '../.env');
if (fs.existsSync(ENV_FILE_PATH)) {
  dotenv.config({ path: ENV_FILE_PATH });
}

// Database configuration
const dbConfig = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000
  }
};

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('[Migration] ⚠️  CONFIG_ENCRYPTION_KEY not set in environment variables');
  console.warn('[Migration] ⚠️  Sensitive data will not be encrypted properly');
}

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
    pool = await sql.connect(dbConfig);
    console.log('[Database] Connected to MSSQL database');
    return pool;
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
    throw error;
  }
}

// Create system_configurations table if it doesn't exist
async function createSystemConfigurationsTable() {
  const createTableQuery = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_configurations' AND xtype='U')
    CREATE TABLE system_configurations (
      id INT IDENTITY(1,1) PRIMARY KEY,
      config_key NVARCHAR(255) NOT NULL UNIQUE,
      config_name NVARCHAR(255) NOT NULL,
      config_description NVARCHAR(MAX),
      config_category NVARCHAR(100) NOT NULL,
      is_sensitive BIT NOT NULL DEFAULT 0,
      is_encrypted BIT NOT NULL DEFAULT 0,
      config_value NVARCHAR(MAX),
      encrypted_value NVARCHAR(MAX),
      encryption_iv NVARCHAR(255),
      encryption_auth_tag NVARCHAR(255),
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE(),
      INDEX IX_system_configurations_category (config_category),
      INDEX IX_system_configurations_key (config_key)
    );
  `;
  
  try {
    await pool.request().query(createTableQuery);
    console.log('[Migration] System configurations table ready');
  } catch (error) {
    console.error('[Migration] Failed to create system_configurations table:', error.message);
    throw error;
  }
}

// Load settings from JSON file
function loadSettings() {
  const settingsPath = path.join(__dirname, '../src/server/data/settings.json');
  
  if (!fs.existsSync(settingsPath)) {
    throw new Error(`Settings file not found: ${settingsPath}`);
  }
  
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  return JSON.parse(settingsContent);
}

// Upsert configuration item
async function upsertConfiguration(key, name, description, category, value, isSensitive = false) {
  let configValue = null;
  let encryptedValue = null;
  let encryptionIv = null;
  let encryptionAuthTag = null;
  let isEncrypted = false;
  
  if (isSensitive && ENCRYPTION_KEY && value) {
    const encrypted = encrypt(value.toString());
    if (encrypted) {
      encryptedValue = encrypted.encrypted;
      encryptionIv = encrypted.iv;
      encryptionAuthTag = encrypted.authTag;
      isEncrypted = true;
      console.log(`[Migration] Encrypted sensitive config: ${key}`);
    } else {
      configValue = value;
      console.log(`[Migration] ⚠️  Failed to encrypt sensitive config: ${key}`);
    }
  } else {
    configValue = value !== null && value !== undefined ? value.toString() : null;
  }
  
  const upsertQuery = `
    MERGE system_configurations AS target
    USING (SELECT @key AS config_key) AS source
    ON target.config_key = source.config_key
    WHEN MATCHED THEN
      UPDATE SET 
        config_name = @name,
        config_description = @description,
        config_category = @category,
        is_sensitive = @isSensitive,
        is_encrypted = @isEncrypted,
        config_value = @configValue,
        encrypted_value = @encryptedValue,
        encryption_iv = @encryptionIv,
        encryption_auth_tag = @encryptionAuthTag,
        updated_at = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (config_key, config_name, config_description, config_category, is_sensitive, is_encrypted, 
              config_value, encrypted_value, encryption_iv, encryption_auth_tag)
      VALUES (@key, @name, @description, @category, @isSensitive, @isEncrypted, 
              @configValue, @encryptedValue, @encryptionIv, @encryptionAuthTag);
  `;
  
  try {
    await pool.request()
      .input('key', sql.NVarChar, key)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('category', sql.NVarChar, category)
      .input('isSensitive', sql.Bit, isSensitive)
      .input('isEncrypted', sql.Bit, isEncrypted)
      .input('configValue', sql.NVarChar, configValue)
      .input('encryptedValue', sql.NVarChar, encryptedValue)
      .input('encryptionIv', sql.NVarChar, encryptionIv)
      .input('encryptionAuthTag', sql.NVarChar, encryptionAuthTag)
      .query(upsertQuery);
    
    console.log(`[Migration] ✓ Migrated config: ${key}`);
  } catch (error) {
    console.error(`[Migration] ❌ Failed to migrate config ${key}:`, error.message);
    throw error;
  }
}

// Migrate Active Directory configuration
async function migrateActiveDirectoryConfig(settings) {
  console.log('[Migration] Starting Active Directory configuration migration...');
  
  const adConfig = settings.activeDirectorySettings;
  
  if (!adConfig) {
    console.log('[Migration] ⚠️  No Active Directory configuration found in settings');
    return;
  }
  
  // Migrate each AD configuration item
  const configItems = [
    {
      key: 'ad.server',
      name: 'Active Directory Server',
      description: 'LDAP/LDAPS server address for Active Directory authentication',
      value: adConfig.server,
      sensitive: false
    },
    {
      key: 'ad.username',
      name: 'Active Directory Username',
      description: 'Service account username for Active Directory authentication',
      value: adConfig.username,
      sensitive: true
    },
    {
      key: 'ad.password',
      name: 'Active Directory Password',
      description: 'Service account password for Active Directory authentication',
      value: adConfig.password,
      sensitive: true
    },
    {
      key: 'ad.domain',
      name: 'Active Directory Domain',
      description: 'Domain name for Active Directory authentication',
      value: adConfig.domain,
      sensitive: false
    },
    {
      key: 'ad.base_dn',
      name: 'Active Directory Base DN',
      description: 'Base Distinguished Name for LDAP searches',
      value: adConfig.baseDN,
      sensitive: false
    },
    {
      key: 'ad.protocol',
      name: 'Active Directory Protocol',
      description: 'Protocol to use for Active Directory connection (ldap/ldaps)',
      value: adConfig.protocol,
      sensitive: false
    },
    {
      key: 'ad.auth_format',
      name: 'Active Directory Auth Format',
      description: 'Authentication format for Active Directory (dn/upn)',
      value: adConfig.authFormat,
      sensitive: false
    },
    {
      key: 'ad.enabled',
      name: 'Active Directory Enabled',
      description: 'Enable or disable Active Directory authentication',
      value: adConfig.enabled,
      sensitive: false
    }
  ];
  
  for (const item of configItems) {
    await upsertConfiguration(
      item.key,
      item.name,
      item.description,
      'active_directory',
      item.value,
      item.sensitive
    );
  }
  
  console.log('[Migration] ✓ Active Directory configuration migrated successfully');
}

// Main migration function
async function migrate() {
  console.log('[Migration] Starting Active Directory configuration migration...');
  
  if (!ENCRYPTION_KEY) {
    console.log('[Migration] ⚠️  CONFIG_ENCRYPTION_KEY not found in environment variables');
    console.log('[Migration] ⚠️  Please set CONFIG_ENCRYPTION_KEY in your .env file');
    console.log('[Migration] ⚠️  Continuing without encryption...');
  } else {
    console.log('[Migration] Environment variables loaded from .env');
  }
  
  try {
    // Connect to database
    await connectToDatabase();
    
    // Create table if needed
    await createSystemConfigurationsTable();
    
    // Load settings
    const settings = loadSettings();
    
    // Migrate Active Directory configuration
    await migrateActiveDirectoryConfig(settings);
    
    console.log('[Migration] ✅ Active Directory configuration migration completed successfully!');
    console.log('[Migration] Next steps:');
    console.log('[Migration] 1. Update your application to read AD config from database');
    console.log('[Migration] 2. Remove AD config from settings.json after testing');
    console.log('[Migration] 3. Ensure CONFIG_ENCRYPTION_KEY is properly set in production');
    
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('[Database] Connection closed');
    }
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('migrate-ad-config.js')) {
  migrate().catch(console.error);
}

export { migrate, migrateActiveDirectoryConfig };
export default migrate;