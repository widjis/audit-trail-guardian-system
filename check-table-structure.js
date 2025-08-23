import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

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

async function checkTableStructure() {
  try {
    console.log('🔍 Connecting to database...');
    const pool = await sql.connect(config);
    
    // Check table structures
    const tables = ['hires', 'users', 'workflow_approvals'];
    
    for (const tableName of tables) {
      console.log(`\n📋 Checking ${tableName} table structure:`);
      
      // Get column information
      const columnsQuery = `
        SELECT 
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT,
          c.CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS c
        WHERE c.TABLE_NAME = '${tableName}'
        ORDER BY c.ORDINAL_POSITION
      `;
      
      const columnsResult = await pool.request().query(columnsQuery);
      
      if (columnsResult.recordset.length === 0) {
        console.log(`❌ Table ${tableName} not found`);
        continue;
      }
      
      console.log('  Columns:');
      columnsResult.recordset.forEach(col => {
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        console.log(`    ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
      });
      
      // Check primary keys
      const pkQuery = `
        SELECT 
          kcu.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE tc.TABLE_NAME = '${tableName}' 
          AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      `;
      
      const pkResult = await pool.request().query(pkQuery);
      
      if (pkResult.recordset.length > 0) {
        console.log('  Primary Key(s):');
        pkResult.recordset.forEach(pk => {
          console.log(`    ${pk.COLUMN_NAME}`);
        });
      } else {
        console.log('  ❌ No primary key found');
      }
    }
    
    await pool.close();
    console.log('\n✅ Table structure check completed');
    
  } catch (error) {
    console.error('❌ Table structure check failed:', error.message);
    process.exit(1);
  }
}

checkTableStructure();