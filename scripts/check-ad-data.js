import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function checkActiveDirectoryData() {
  let pool;
  
  try {
    console.log('🔍 Checking Active Directory data in database...');
    
    // Connect to database
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to database');
    
    // Check if system_configurations table exists
    const tableExistsQuery = `
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'system_configurations'
    `;
    
    const tableResult = await pool.request().query(tableExistsQuery);
    console.log('📋 system_configurations table exists:', tableResult.recordset[0].table_count > 0);
    
    if (tableResult.recordset[0].table_count === 0) {
      console.log('❌ system_configurations table does not exist');
      return;
    }
    
    // Check all configurations
    const allConfigsQuery = `
      SELECT config_key, config_category, config_name, is_encrypted, is_active
      FROM system_configurations
      ORDER BY config_category, config_key
    `;
    
    const allConfigs = await pool.request().query(allConfigsQuery);
    console.log('📋 Total configurations in database:', allConfigs.recordset.length);
    
    if (allConfigs.recordset.length > 0) {
      console.log('\n📋 All configurations:');
      allConfigs.recordset.forEach(config => {
        console.log(`  - ${config.config_key} (${config.config_category}) - Encrypted: ${config.is_encrypted}, Active: ${config.is_active}`);
      });
    }
    
    // Check specifically for Active Directory configurations
    const adConfigsQuery = `
      SELECT config_key, config_name, config_value, is_encrypted, is_active
      FROM system_configurations
      WHERE config_category = 'active_directory'
      ORDER BY config_key
    `;
    
    const adConfigs = await pool.request().query(adConfigsQuery);
    console.log('\n📋 Active Directory configurations found:', adConfigs.recordset.length);
    
    if (adConfigs.recordset.length > 0) {
      console.log('\n📋 Active Directory configurations:');
      adConfigs.recordset.forEach(config => {
        const value = config.is_encrypted ? '***ENCRYPTED***' : config.config_value;
        console.log(`  - ${config.config_key}: ${value} (Active: ${config.is_active})`);
      });
    } else {
      console.log('❌ No Active Directory configurations found in database');
      console.log('💡 This might be why the API endpoints are failing');
    }
    
    // Check for HRIS configurations as comparison
    const hrisConfigsQuery = `
      SELECT config_key, config_name, is_encrypted, is_active
      FROM system_configurations
      WHERE config_category = 'hris_database'
      ORDER BY config_key
    `;
    
    const hrisConfigs = await pool.request().query(hrisConfigsQuery);
    console.log('\n📋 HRIS configurations found (for comparison):', hrisConfigs.recordset.length);
    
    if (hrisConfigs.recordset.length > 0) {
      console.log('\n📋 HRIS configurations:');
      hrisConfigs.recordset.forEach(config => {
        console.log(`  - ${config.config_key} (Active: ${config.is_active})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking Active Directory data:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the check
checkActiveDirectoryData().catch(console.error);