#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
const ENV_FILE_PATH = path.join(__dirname, '../.env');
if (fs.existsSync(ENV_FILE_PATH)) {
  dotenv.config({ path: ENV_FILE_PATH });
  console.log('✅ Environment variables loaded from .env');
} else {
  console.error('❌ .env file not found at:', ENV_FILE_PATH);
  process.exit(1);
}

// Database connection variables
let dbPool = null;
const dbType = process.env.DB_TYPE || 'mssql';

/**
 * Initialize database connection
 */
async function initDbConnection() {
  try {
    console.log('🔌 Initializing database connection...');

    if (dbType === 'mssql') {
      const mssql = await import('mssql');
      
      let server = process.env.DB_HOST;
      if (process.env.DB_INSTANCE) {
        server = `${process.env.DB_HOST}\\${process.env.DB_INSTANCE}`;
      }
      
      const config = {
        server,
        port: parseInt(process.env.DB_PORT || '1433'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: true,
          enableArithAbort: true
        }
      };
      
      dbPool = await new mssql.default.ConnectionPool(config).connect();
      console.log('✅ MSSQL connection established');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error.message);
    throw error;
  }
}

/**
 * Execute SQL query
 */
async function executeQuery(query) {
  try {
    if (dbType === 'mssql') {
      const request = dbPool.request();
      const result = await request.query(query);
      return result;
    }
  } catch (error) {
    console.error('❌ Query execution error:', error.message);
    throw error;
  }
}

/**
 * Create user_preferences table
 */
async function createUserPreferencesTable() {
  try {
    console.log('\n🔧 Creating user_preferences table...');
    
    // First, check if table already exists
    const checkTableQuery = `
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'user_preferences' 
      AND TABLE_CATALOG = '${process.env.DB_NAME}'
    `;
    
    const tableCheck = await executeQuery(checkTableQuery);
    
    if (tableCheck.recordset[0].table_count > 0) {
      console.log('ℹ️  user_preferences table already exists');
      return true;
    }
    
    // Create the table without foreign key constraint first
    const createTableQuery = `
      CREATE TABLE user_preferences (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        preference_key VARCHAR(255) NOT NULL,
        preference_value TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_user_preferences_user_key UNIQUE(user_id, preference_key)
      )
    `;
    
    console.log('📝 Executing table creation...');
    await executeQuery(createTableQuery);
    console.log('✅ user_preferences table created successfully');
    
    // Check if users table exists before adding foreign key
    const checkUsersQuery = `
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'users' 
      AND TABLE_CATALOG = '${process.env.DB_NAME}'
    `;
    
    const usersCheck = await executeQuery(checkUsersQuery);
    
    if (usersCheck.recordset[0].table_count > 0) {
      console.log('🔗 Adding foreign key constraint to users table...');
      
      try {
        const addForeignKeyQuery = `
          ALTER TABLE user_preferences 
          ADD CONSTRAINT FK_user_preferences_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id)
        `;
        
        await executeQuery(addForeignKeyQuery);
        console.log('✅ Foreign key constraint added successfully');
      } catch (fkError) {
        console.log('⚠️  Could not add foreign key constraint:', fkError.message);
        console.log('   This is not critical - the table will still function correctly');
      }
    } else {
      console.log('⚠️  users table not found - skipping foreign key constraint');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Failed to create user_preferences table:', error.message);
    
    // Provide more specific error information
    if (error.number) {
      console.error(`   SQL Error Number: ${error.number}`);
    }
    if (error.code) {
      console.error(`   SQL Error Code: ${error.code}`);
    }
    
    throw error;
  }
}

/**
 * Verify table creation
 */
async function verifyTable() {
  try {
    console.log('\n🔍 Verifying user_preferences table...');
    
    // Check table exists
    const tableQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'user_preferences'
    `;
    
    const tables = await executeQuery(tableQuery);
    
    if (tables.recordset.length === 0) {
      console.log('❌ Table verification failed - table does not exist');
      return false;
    }
    
    console.log('✅ Table exists');
    
    // Check columns
    const columnsQuery = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'user_preferences'
      ORDER BY ORDINAL_POSITION
    `;
    
    const columns = await executeQuery(columnsQuery);
    
    console.log('\n📊 Table Columns:');
    columns.recordset.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE}`);
    });
    
    // Check constraints
    const constraintsQuery = `
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        kcu.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = 'user_preferences'
      ORDER BY tc.CONSTRAINT_TYPE, tc.CONSTRAINT_NAME
    `;
    
    const constraints = await executeQuery(constraintsQuery);
    
    if (constraints.recordset.length > 0) {
      console.log('\n🔒 Table Constraints:');
      constraints.recordset.forEach(constraint => {
        console.log(`   • ${constraint.CONSTRAINT_TYPE}: ${constraint.CONSTRAINT_NAME} (${constraint.COLUMN_NAME || 'N/A'})`);
      });
    }
    
    console.log('\n✅ Table verification successful!');
    return true;
    
  } catch (error) {
    console.error('💥 Table verification failed:', error.message);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Create user_preferences Table Script');
  console.log('======================================\n');
  
  try {
    // Initialize database connection
    await initDbConnection();
    
    // Create table
    await createUserPreferencesTable();
    
    // Verify creation
    await verifyTable();
    
    console.log('\n🎉 user_preferences table setup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    if (dbPool) {
      try {
        if (dbType === 'mssql') {
          await dbPool.close();
        }
        console.log('🔌 Database connection closed');
      } catch (error) {
        console.error('⚠️  Error closing database connection:', error.message);
      }
    }
  }
}

// Run the script
main();