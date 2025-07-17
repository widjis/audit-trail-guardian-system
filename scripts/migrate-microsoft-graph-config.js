import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  server: process.env.DB_HOST || '10.60.10.47',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'EmployeeWorkflow',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Bl4ck3y34dmin',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  }
};

// Encryption configuration
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

let pool;

// Encryption function
function encrypt(text) {
  if (!text || !ENCRYPTION_KEY) return null;
  
  try {
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
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error);
    return null;
  }
}

// Connect to database
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
      is_active BIT NOT NULL DEFAULT 1,
      created_by NVARCHAR(100) DEFAULT 'migration',
      updated_by NVARCHAR(100) DEFAULT 'migration',
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
        updated_at = GETDATE(),
        updated_by = 'migration'
    WHEN NOT MATCHED THEN
      INSERT (config_key, config_name, config_description, config_category, is_sensitive, is_encrypted, 
              config_value, encrypted_value, encryption_iv, encryption_auth_tag, created_by, updated_by)
      VALUES (@key, @name, @description, @category, @isSensitive, @isEncrypted, 
              @configValue, @encryptedValue, @encryptionIv, @encryptionAuthTag, 'migration', 'migration');
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

// Migrate Microsoft Graph configuration
async function migrateMicrosoftGraphConfig(settings) {
  console.log('[Migration] Starting Microsoft Graph configuration migration...');
  
  const graphConfig = settings.microsoftGraphSettings;
  
  if (!graphConfig) {
    console.log('[Migration] ⚠️  No Microsoft Graph configuration found in settings');
    return;
  }
  
  // Migrate each Microsoft Graph configuration item
  const configItems = [
    {
      key: 'msgraph.enabled',
      name: 'Microsoft Graph Enabled',
      description: 'Enable or disable Microsoft Graph integration',
      value: graphConfig.enabled,
      sensitive: false
    },
    {
      key: 'msgraph.tenant_id',
      name: 'Microsoft Graph Tenant ID',
      description: 'Azure AD tenant ID for Microsoft Graph authentication',
      value: graphConfig.tenantId,
      sensitive: false
    },
    {
      key: 'msgraph.client_id',
      name: 'Microsoft Graph Client ID',
      description: 'Azure AD application client ID for Microsoft Graph',
      value: graphConfig.clientId,
      sensitive: false
    },
    {
      key: 'msgraph.client_secret',
      name: 'Microsoft Graph Client Secret',
      description: 'Azure AD application client secret for Microsoft Graph authentication',
      value: graphConfig.clientSecret,
      sensitive: true
    },
    {
      key: 'msgraph.scope',
      name: 'Microsoft Graph Scope',
      description: 'OAuth scope for Microsoft Graph API access',
      value: graphConfig.scope,
      sensitive: false
    },
    {
      key: 'msgraph.default_to_recipients',
      name: 'Microsoft Graph Default To Recipients',
      description: 'Default email recipients for Microsoft Graph emails',
      value: Array.isArray(graphConfig.defaultToRecipients) ? JSON.stringify(graphConfig.defaultToRecipients) : graphConfig.defaultToRecipients,
      sensitive: false
    },
    {
      key: 'msgraph.default_cc_recipients',
      name: 'Microsoft Graph Default CC Recipients',
      description: 'Default CC recipients for Microsoft Graph emails',
      value: Array.isArray(graphConfig.defaultCcRecipients) ? JSON.stringify(graphConfig.defaultCcRecipients) : graphConfig.defaultCcRecipients,
      sensitive: false
    },
    {
      key: 'msgraph.default_bcc_recipients',
      name: 'Microsoft Graph Default BCC Recipients',
      description: 'Default BCC recipients for Microsoft Graph emails',
      value: Array.isArray(graphConfig.defaultBccRecipients) ? JSON.stringify(graphConfig.defaultBccRecipients) : graphConfig.defaultBccRecipients,
      sensitive: false
    },
    {
      key: 'msgraph.sender_email',
      name: 'Microsoft Graph Sender Email',
      description: 'Default sender email address for Microsoft Graph emails',
      value: graphConfig.senderEmail,
      sensitive: false
    },
    {
      key: 'msgraph.use_logged_in_user_as_sender',
      name: 'Microsoft Graph Use Logged-in User as Sender',
      description: 'Use logged-in user email as sender when available',
      value: graphConfig.useLoggedInUserAsSender,
      sensitive: false
    },
    {
      key: 'msgraph.email_subject_template',
      name: 'Microsoft Graph Email Subject Template',
      description: 'Template for email subject line with placeholders',
      value: graphConfig.emailSubjectTemplate,
      sensitive: false
    },
    {
      key: 'msgraph.email_body_template',
      name: 'Microsoft Graph Email Body Template',
      description: 'Template for email body content with placeholders',
      value: graphConfig.emailBodyTemplate,
      sensitive: false
    }
  ];
  
  for (const item of configItems) {
    if (item.value !== undefined && item.value !== null) {
      await upsertConfiguration(
        item.key,
        item.name,
        item.description,
        'microsoft_graph',
        item.value,
        item.sensitive
      );
    }
  }
  
  console.log('[Migration] ✓ Microsoft Graph configuration migration completed');
}

// Main migration function
async function main() {
  try {
    console.log('[Migration] Starting Microsoft Graph configuration migration...');
    
    // Check if encryption key is available
    if (!ENCRYPTION_KEY) {
      console.warn('[Migration] ⚠️  CONFIG_ENCRYPTION_KEY not found. Sensitive data will not be encrypted.');
    } else {
      console.log('[Migration] ✓ Encryption key found. Sensitive data will be encrypted.');
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Create table if needed
    await createSystemConfigurationsTable();
    
    // Load settings
    const settings = loadSettings();
    console.log('[Migration] ✓ Settings loaded from JSON file');
    
    // Migrate Microsoft Graph configuration
    await migrateMicrosoftGraphConfig(settings);
    
    console.log('[Migration] ✅ Microsoft Graph configuration migration completed successfully!');
    console.log('[Migration] 📝 Next steps:');
    console.log('[Migration]   1. Update Microsoft Graph service to use system-config-service');
    console.log('[Migration]   2. Update Microsoft Graph routes to use system-config-service');
    console.log('[Migration]   3. Test Microsoft Graph functionality');
    
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error.message);
    console.error('[Migration] Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('[Migration] Database connection closed');
    }
  }
}

// Run migration
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { migrateMicrosoftGraphConfig };