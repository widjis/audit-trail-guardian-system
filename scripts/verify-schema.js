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
      return result.recordset;
    }
  } catch (error) {
    console.error('❌ Query execution error:', error.message);
    throw error;
  }
}

/**
 * Verify schema tables exist
 */
async function verifySchema() {
  try {
    console.log('\n🔍 Verifying database schema...');
    
    // List of expected tables
    const expectedTables = [
      'users',
      'departments', 
      'hires',
      'audit_logs',
      'ms365_license_types',
      'user_preferences'
    ];
    
    // Query to get all tables
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_CATALOG = '${process.env.DB_NAME}'
      ORDER BY TABLE_NAME
    `;
    
    const tables = await executeQuery(tablesQuery);
    const existingTables = tables.map(row => row.TABLE_NAME.toLowerCase());
    
    console.log('\n📋 Database Tables Status:');
    console.log('========================');
    
    let allTablesExist = true;
    
    for (const expectedTable of expectedTables) {
      const exists = existingTables.includes(expectedTable.toLowerCase());
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${expectedTable}`);
      
      if (!exists) {
        allTablesExist = false;
      }
    }
    
    // Check for additional tables
    const additionalTables = existingTables.filter(table => 
      !expectedTables.map(t => t.toLowerCase()).includes(table)
    );
    
    if (additionalTables.length > 0) {
      console.log('\n📝 Additional Tables Found:');
      additionalTables.forEach(table => {
        console.log(`ℹ️  ${table}`);
      });
    }
    
    // Verify user_preferences table structure
    if (existingTables.includes('user_preferences')) {
      console.log('\n🔍 Verifying user_preferences table structure...');
      
      const columnsQuery = `
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'user_preferences'
        ORDER BY ORDINAL_POSITION
      `;
      
      const columns = await executeQuery(columnsQuery);
      
      console.log('\n📊 user_preferences Table Columns:');
      columns.forEach(col => {
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
      
      if (constraints.length > 0) {
        console.log('\n🔒 user_preferences Table Constraints:');
        constraints.forEach(constraint => {
          console.log(`   • ${constraint.CONSTRAINT_TYPE}: ${constraint.CONSTRAINT_NAME} (${constraint.COLUMN_NAME || 'N/A'})`);
        });
      }
    }
    
    console.log('\n📈 Schema Verification Summary:');
    console.log(`   📊 Expected tables: ${expectedTables.length}`);
    console.log(`   ✅ Existing tables: ${expectedTables.filter(t => existingTables.includes(t.toLowerCase())).length}`);
    console.log(`   📋 Total tables in database: ${existingTables.length}`);
    
    if (allTablesExist) {
      console.log('\n🎉 All expected tables exist! Schema verification successful.');
    } else {
      console.log('\n⚠️  Some expected tables are missing. Please run the schema update script.');
    }
    
  } catch (error) {
    console.error('💥 Schema verification failed:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Database Schema Verification Script');
  console.log('=====================================\n');
  
  try {
    // Initialize database connection
    await initDbConnection();
    
    // Verify schema
    await verifySchema();
    
    console.log('\n🏁 Verification completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Verification failed:', error.message);
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