import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery, initDbConnection } from '../src/server/utils/dbConnection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrateHybridAuth() {
  try {
    console.log('\n🚀 Starting Hybrid Authentication Migration');
    console.log('==========================================');

    // Initialize database connection
    await initDbConnection();
    console.log('✅ Database connection initialized');

    // Step 1: Add authentication_type column to users table
    await addAuthenticationTypeColumn();

    // Step 2: Create system_configurations table if it doesn't exist
    await createSystemConfigurationsTable();

    // Step 3: Add authentication mode configuration
    await addAuthenticationModeConfig();

    console.log('\n✅ Hybrid Authentication Migration completed successfully!');
    console.log('==========================================');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

async function addAuthenticationTypeColumn() {
  try {
    console.log('\n🔧 Adding authentication_type column to users table...');

    // Check if authentication_type column exists
    const checkColumnQuery = `
      SELECT COUNT(*) as column_count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'authentication_type'
      AND TABLE_CATALOG = '${process.env.DB_NAME}'
    `;

    const columnCheck = await executeQuery(checkColumnQuery);
    
    if (columnCheck[0].column_count === 0) {
      // Add authentication_type column
      const addColumnQuery = `
        ALTER TABLE users 
        ADD authentication_type VARCHAR(20) NOT NULL DEFAULT 'local'
      `;
      
      await executeQuery(addColumnQuery);
      console.log('✅ authentication_type column added to users table');
    } else {
      console.log('ℹ️  authentication_type column already exists in users table');
    }

    // Check if approved column exists
    const checkApprovedColumnQuery = `
      SELECT COUNT(*) as column_count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'approved'
      AND TABLE_CATALOG = '${process.env.DB_NAME}'
    `;

    const approvedColumnCheck = await executeQuery(checkApprovedColumnQuery);
    
    if (approvedColumnCheck[0].column_count === 0) {
      // Add approved column
      const addApprovedColumnQuery = `
        ALTER TABLE users 
        ADD approved BIT NOT NULL DEFAULT 1
      `;
      
      await executeQuery(addApprovedColumnQuery);
      console.log('✅ approved column added to users table');
    } else {
      console.log('ℹ️  approved column already exists in users table');
    }

  } catch (error) {
    console.error('❌ Error adding authentication_type column:', error);
    throw error;
  }
}

async function createSystemConfigurationsTable() {
  try {
    console.log('\n🔧 Creating system_configurations table...');

    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_configurations' AND xtype='U')
      BEGIN
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
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
        );
      END
    `;

    await executeQuery(createTableQuery);
    console.log('✅ system_configurations table created/verified');

  } catch (error) {
    console.error('❌ Error creating system_configurations table:', error);
    throw error;
  }
}

async function addAuthenticationModeConfig() {
  try {
    console.log('\n🔧 Adding authentication mode configuration...');

    // Check if authentication mode config already exists
    const checkConfigQuery = `
      SELECT COUNT(*) as config_count 
      FROM system_configurations 
      WHERE config_key = 'auth_mode'
    `;

    const configCheck = await executeQuery(checkConfigQuery);
    
    if (configCheck[0].config_count === 0) {
      // Add authentication mode configuration
      const addConfigQuery = `
        INSERT INTO system_configurations (
          config_key, 
          config_name, 
          config_description, 
          config_category, 
          is_sensitive, 
          is_encrypted, 
          config_value
        ) VALUES (
          'auth_mode',
          'Authentication Mode',
          'Determines whether to use local authentication, LDAP/Active Directory, or hybrid mode',
          'Authentication',
          0,
          0,
          'local'
        )
      `;
      
      await executeQuery(addConfigQuery);
      console.log('✅ Authentication mode configuration added');
    } else {
      console.log('ℹ️  Authentication mode configuration already exists');
    }

    // Add LDAP fallback configuration
    const checkLdapFallbackQuery = `
      SELECT COUNT(*) as config_count 
      FROM system_configurations 
      WHERE config_key = 'ldap_fallback_enabled'
    `;

    const ldapFallbackCheck = await executeQuery(checkLdapFallbackQuery);
    
    if (ldapFallbackCheck[0].config_count === 0) {
      const addLdapFallbackQuery = `
        INSERT INTO system_configurations (
          config_key, 
          config_name, 
          config_description, 
          config_category, 
          is_sensitive, 
          is_encrypted, 
          config_value
        ) VALUES (
          'ldap_fallback_enabled',
          'LDAP Fallback Enabled',
          'When enabled, allows fallback to local authentication if LDAP authentication fails',
          'Authentication',
          0,
          0,
          'true'
        )
      `;
      
      await executeQuery(addLdapFallbackQuery);
      console.log('✅ LDAP fallback configuration added');
    } else {
      console.log('ℹ️  LDAP fallback configuration already exists');
    }

  } catch (error) {
    console.error('❌ Error adding authentication mode configuration:', error);
    throw error;
  }
}

// Run the migration
migrateHybridAuth();