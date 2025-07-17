import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Database configuration
const dbConfig = {
  server: process.env.DB_HOST || process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'audit_trail_guardian',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123!',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

// Encryption configuration
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

let pool;

// Encryption function
function encrypt(text) {
  if (!ENCRYPTION_KEY) {
    console.warn('[Migration] CONFIG_ENCRYPTION_KEY not found, storing as plain text');
    return null;
  }
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('[Migration] Encryption failed:', error);
    return null;
  }
}

// Initialize database connection
async function initializeDatabase() {
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    console.log('[Migration] Connected to database successfully');
    return pool;
  } catch (error) {
    console.error('[Migration] Database connection failed:', error.message);
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
    console.log('[Migration] Settings file not found, using default WhatsApp configuration');
    return {
      whatsappSettings: {
        apiUrl: '',
        defaultMessage: `Welcome aboard to PT. Merdeka Tsingshan Indonesia. 
By this message, we inform you regarding your account information for the email address: {{email}}
Name: {{name}}
Title: {{title}}
Department: {{department}}
Email: {{email}}
Password: {{password}}

Please don't hesitate to contact IT for any question.`,
        defaultRecipient: 'userNumber',
        newHireNotificationEnabled: false,
        newHireNotificationTemplate: `🎉 New Hire Alert!

A new employee is joining us:

Name: {{name}}
Title: {{title}}
Department: {{department}}
Start Date: {{startDate}}
Email: {{email}}

License request has been successfully sent to the IT team.`,
        newHireNotificationRecipients: []
      }
    };
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

// Migrate WhatsApp configuration
async function migrateWhatsAppConfig(settings) {
  console.log('[Migration] Starting WhatsApp configuration migration...');
  
  const whatsappConfig = settings.whatsappSettings || {};
  
  // Migrate each WhatsApp configuration item
  const configItems = [
    {
      key: 'whatsapp.api_url',
      name: 'WhatsApp API URL',
      description: 'The URL of the WhatsApp messaging API service',
      value: whatsappConfig.apiUrl || '',
      sensitive: false
    },
    {
      key: 'whatsapp.default_message',
      name: 'WhatsApp Default Message Template',
      description: 'Default message template for WhatsApp notifications with placeholder variables',
      value: whatsappConfig.defaultMessage || `Welcome aboard to PT. Merdeka Tsingshan Indonesia. 
By this message, we inform you regarding your account information for the email address: {{email}}
Name: {{name}}
Title: {{title}}
Department: {{department}}
Email: {{email}}
Password: {{password}}

Please don't hesitate to contact IT for any question.`,
      sensitive: false
    },
    {
      key: 'whatsapp.default_recipient',
      name: 'WhatsApp Default Recipient Type',
      description: 'Default recipient type for WhatsApp messages (userNumber or testNumber)',
      value: whatsappConfig.defaultRecipient || 'userNumber',
      sensitive: false
    },
    {
      key: 'whatsapp.new_hire_notification_enabled',
      name: 'New Hire Notification Enabled',
      description: 'Enable or disable WhatsApp notifications for new hires after license request',
      value: whatsappConfig.newHireNotificationEnabled || false,
      sensitive: false
    },
    {
      key: 'whatsapp.new_hire_notification_template',
      name: 'New Hire Notification Template',
      description: 'WhatsApp message template for new hire notifications with placeholder variables (supports both single and multiple hires)',
      value: whatsappConfig.newHireNotificationTemplate || `🎉 New Hire Alert!

We have {{hireCount}} new employee(s) joining us:

{{hireDetails}}

License request has been successfully sent to the IT team.

Please prepare the necessary equipment and access for these new team members.`,
      sensitive: false
    },
    {
      key: 'whatsapp.new_hire_notification_recipients',
      name: 'New Hire Notification Recipients',
      description: 'List of phone numbers to receive new hire notifications',
      value: Array.isArray(whatsappConfig.newHireNotificationRecipients) ? JSON.stringify(whatsappConfig.newHireNotificationRecipients) : '[]',
      sensitive: false
    },
    {
      key: 'whatsapp.group_notification_enabled',
      name: 'Group Notification Enabled',
      description: 'Enable or disable WhatsApp group notifications for new hires',
      value: whatsappConfig.groupNotificationEnabled || false,
      sensitive: false
    },
    {
      key: 'whatsapp.group_id',
      name: 'WhatsApp Group ID',
      description: 'The ID of the WhatsApp group for notifications',
      value: whatsappConfig.groupId || '',
      sensitive: false
    },
    {
      key: 'whatsapp.group_name',
      name: 'WhatsApp Group Name',
      description: 'The name of the WhatsApp group for notifications',
      value: whatsappConfig.groupName || '',
      sensitive: false
    },
    {
      key: 'whatsapp.group_mentions',
      name: 'WhatsApp Group Mentions',
      description: 'List of phone numbers to mention in group notifications',
      value: Array.isArray(whatsappConfig.groupMentions) ? JSON.stringify(whatsappConfig.groupMentions) : '[]',
      sensitive: false
    }
  ];
  
  for (const item of configItems) {
    await upsertConfiguration(
      item.key,
      item.name,
      item.description,
      'whatsapp',
      item.value,
      item.sensitive
    );
  }
  
  console.log('[Migration] ✓ WhatsApp configuration migration completed');
}

// Main migration function
async function main() {
  try {
    console.log('[Migration] Starting WhatsApp configuration migration...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Create table if needed
    await createSystemConfigurationsTable();
    
    // Load settings
    const settings = loadSettings();
    
    // Migrate WhatsApp configuration
    await migrateWhatsAppConfig(settings);
    
    console.log('[Migration] ✅ WhatsApp configuration migration completed successfully!');
    
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('[Migration] Database connection closed');
    }
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as migrateWhatsAppConfig };