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
    console.log(`📊 Using database type: ${dbType}`);

    if (dbType === 'mssql') {
      const mssql = await import('mssql');
      
      // Build server string based on whether instance is provided
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
      
      // Log the connection configuration (excluding password)
      const logConfig = {
        ...config,
        password: '********' // Hide actual password
      };
      console.log('🔧 Connection config:', JSON.stringify(logConfig, null, 2));
      
      dbPool = await new mssql.default.ConnectionPool(config).connect();
      console.log('✅ MSSQL connection pool successfully initialized');
    } else if (dbType === 'postgres') {
      const { Pool } = await import('pg');
      dbPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });
      console.log('✅ PostgreSQL connection pool initialized');
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
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
    } else if (dbType === 'postgres') {
      const result = await dbPool.query(query);
      return result;
    }
  } catch (error) {
    console.error('❌ Query execution error:', error.message);
    throw error;
  }
}

/**
 * Read and execute schema file
 */
async function updateSchema() {
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../src/server/data/dbSchema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    console.log('📄 Reading schema file:', schemaPath);
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Clean the schema content - remove comments and empty lines
    const cleanedContent = schemaContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--');
      })
      .join('\n');
    
    // Split into statements using a more sophisticated approach
    // Look for IF NOT EXISTS...BEGIN...END blocks as complete statements
    const statements = [];
    let currentStatement = '';
    let inBlock = false;
    let beginCount = 0;
    
    const lines = cleanedContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim().toUpperCase();
      
      // Start of a new IF NOT EXISTS block
      if (trimmedLine.startsWith('IF NOT EXISTS')) {
        // If we have a previous statement, save it
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentStatement = line + '\n';
        inBlock = true;
        beginCount = 0;
        continue;
      }
      
      // Add line to current statement
      currentStatement += line + '\n';
      
      // Count BEGIN and END keywords when in a block
      if (inBlock) {
        if (trimmedLine.includes('BEGIN')) {
          beginCount++;
        }
        if (trimmedLine.includes('END')) {
          beginCount--;
          
          // If we've closed all BEGIN blocks, this statement is complete
          if (beginCount === 0) {
            statements.push(currentStatement.trim());
            currentStatement = '';
            inBlock = false;
          }
        }
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Filter out empty statements
    const validStatements = statements.filter(statement => statement.trim());
    
    console.log(`📝 Found ${validStatements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i].trim();
      if (!statement) continue;
      
      try {
        console.log(`\n🔄 Executing statement ${i + 1}/${validStatements.length}...`);
        console.log('📋 SQL:', statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        await executeQuery(statement);
        console.log('✅ Statement executed successfully');
        successCount++;
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        
        // Log more details for MSSQL errors
        if (error.number) {
          console.error(`   SQL Error Number: ${error.number}`);
        }
        if (error.code) {
          console.error(`   SQL Error Code: ${error.code}`);
        }
        
        errorCount++;
        
        // Continue with other statements unless it's a critical error
        if (error.message.includes('database') && error.message.includes('does not exist')) {
          console.error('💥 Critical database error, stopping execution');
          throw error;
        }
      }
    }
    
    console.log('\n📊 Schema Update Summary:');
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);
    console.log(`   📈 Total statements: ${validStatements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Schema update completed successfully!');
    } else {
      console.log('\n⚠️  Schema update completed with some errors. Please review the logs above.');
    }
    
  } catch (error) {
    console.error('💥 Schema update failed:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Database Schema Update Script');
  console.log('==========================================\n');
  
  try {
    // Initialize database connection
    await initDbConnection();
    
    // Execute schema update
    await updateSchema();
    
    console.log('\n🏁 Script completed successfully!');
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
        } else if (dbType === 'postgres') {
          await dbPool.end();
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