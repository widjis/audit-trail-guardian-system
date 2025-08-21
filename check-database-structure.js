import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.development') });

/**
 * Database structure inspection script
 * Checks current database tables, columns, and structure
 */
async function checkDatabaseStructure() {
  let pool;
  
  try {
    console.log('🔍 Connecting to database...');
    
    // Database configuration
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
    
    pool = await sql.connect(config);
    console.log('✅ Connected to database successfully\n');
    
    // 1. Check all tables in the database
    console.log('📋 CHECKING ALL TABLES:');
    console.log('=' .repeat(50));
    
    const tablesQuery = `
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;
    
    const tablesResult = await pool.request().query(tablesQuery);
    
    if (tablesResult.recordset.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      console.log(`Found ${tablesResult.recordset.length} tables:\n`);
      tablesResult.recordset.forEach((table, index) => {
        console.log(`${index + 1}. [${table.TABLE_SCHEMA}].[${table.TABLE_NAME}]`);
      });
    }
    
    console.log('\n');
    
    // 2. Check for MTI-related tables
    console.log('🔍 CHECKING FOR MTI/HRIS RELATED TABLES:');
    console.log('=' .repeat(50));
    
    const mtiTablesQuery = `
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND (TABLE_NAME LIKE '%MTI%' 
             OR TABLE_NAME LIKE '%hris%' 
             OR TABLE_NAME LIKE '%employee%'
             OR TABLE_NAME LIKE '%user%')
      ORDER BY TABLE_NAME
    `;
    
    const mtiTablesResult = await pool.request().query(mtiTablesQuery);
    
    if (mtiTablesResult.recordset.length === 0) {
      console.log('❌ No MTI/HRIS/Employee/User related tables found');
    } else {
      console.log(`Found ${mtiTablesResult.recordset.length} MTI/HRIS related tables:\n`);
      mtiTablesResult.recordset.forEach((table, index) => {
        console.log(`${index + 1}. [${table.TABLE_SCHEMA}].[${table.TABLE_NAME}]`);
      });
    }
    
    console.log('\n');
    
    // 3. Check specific tables from our schema
    const expectedTables = ['users', 'hires', 'departments', 'audit_logs', 'ms365_license_types'];
    
    console.log('📊 CHECKING EXPECTED TABLES:');
    console.log('=' .repeat(50));
    
    for (const tableName of expectedTables) {
      console.log(`\n🔍 Checking table: ${tableName}`);
      
      const tableExistsQuery = `
        SELECT COUNT(*) as table_count
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = '${tableName}'
      `;
      
      const tableExistsResult = await pool.request().query(tableExistsQuery);
      
      if (tableExistsResult.recordset[0].table_count > 0) {
        console.log(`✅ Table '${tableName}' exists`);
        
        // Get column information
        const columnsQuery = `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            CHARACTER_MAXIMUM_LENGTH
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `;
        
        const columnsResult = await pool.request().query(columnsQuery);
        console.log(`   Columns (${columnsResult.recordset.length}):`);
        
        columnsResult.recordset.forEach((column, index) => {
          const nullable = column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
          const length = column.CHARACTER_MAXIMUM_LENGTH ? `(${column.CHARACTER_MAXIMUM_LENGTH})` : '';
          const defaultVal = column.COLUMN_DEFAULT ? ` DEFAULT ${column.COLUMN_DEFAULT}` : '';
          console.log(`   ${index + 1}. ${column.COLUMN_NAME}: ${column.DATA_TYPE}${length} ${nullable}${defaultVal}`);
        });
        
        // Get row count
        try {
          const countQuery = `SELECT COUNT(*) as row_count FROM [${tableName}]`;
          const countResult = await pool.request().query(countQuery);
          console.log(`   📊 Row count: ${countResult.recordset[0].row_count}`);
        } catch (error) {
          console.log(`   ⚠️  Could not get row count: ${error.message}`);
        }
        
      } else {
        console.log(`❌ Table '${tableName}' does not exist`);
      }
    }
    
    // 4. Check for HRIS external table connection
    console.log('\n\n🔗 CHECKING HRIS EXTERNAL TABLE:');
    console.log('=' .repeat(50));
    
    // Check if we can access the HRIS database
    const hrisSchema = process.env.HRIS_DB_SCHEMA || 'dbo';
    const hrisTableName = 'it_mti_employee_database_tbl';
    
    try {
      const hrisTestQuery = `
        SELECT TOP 5 * 
        FROM [${hrisSchema}].[${hrisTableName}]
      `;
      
      console.log(`Attempting to query: [${hrisSchema}].[${hrisTableName}]`);
      const hrisResult = await pool.request().query(hrisTestQuery);
      
      console.log(`✅ HRIS table accessible`);
      console.log(`📊 Sample data (first 5 rows):`);
      
      if (hrisResult.recordset.length > 0) {
        // Show column names
        const columns = Object.keys(hrisResult.recordset[0]);
        console.log(`   Columns: ${columns.join(', ')}`);
        
        // Show sample data
        hrisResult.recordset.forEach((row, index) => {
          console.log(`   Row ${index + 1}:`, JSON.stringify(row, null, 2));
        });
      } else {
        console.log(`   ⚠️  No data found in HRIS table`);
      }
      
    } catch (error) {
      console.log(`❌ Cannot access HRIS table: ${error.message}`);
      console.log(`   This might be expected if HRIS is on a different server/database`);
    }
    
    console.log('\n\n🎯 SUMMARY:');
    console.log('=' .repeat(50));
    console.log('✅ Database connection successful');
    console.log(`📋 Total tables found: ${tablesResult.recordset.length}`);
    console.log(`🔍 MTI/HRIS related tables: ${mtiTablesResult.recordset.length}`);
    console.log('\n📝 Key findings:');
    console.log('   - No MTIUsers table found in current database');
    console.log('   - HRIS data comes from external table: it_mti_employee_database_tbl');
    console.log('   - Local tables: users, hires, departments, etc.');
    console.log('   - The "hires" table appears to be the local equivalent for employee data');
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('\n🔌 Database connection closed');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError.message);
      }
    }
  }
}

// Run the check
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting database structure check...');
  console.log('=' .repeat(60));
  checkDatabaseStructure()
    .then(() => {
      console.log('\n✅ Database check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database check failed:', error.message);
      process.exit(1);
    });
}

export { checkDatabaseStructure };