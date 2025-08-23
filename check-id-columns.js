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

async function checkIdColumns() {
  try {
    console.log('🔍 Connecting to database...');
    const pool = await sql.connect(config);
    
    // Check specific ID columns that are involved in foreign key relationships
    const queries = [
      {
        name: 'hires.id',
        query: `
          SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS c
          WHERE c.TABLE_NAME = 'hires' AND c.COLUMN_NAME = 'id'
        `
      },
      {
        name: 'users.id',
        query: `
          SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS c
          WHERE c.TABLE_NAME = 'users' AND c.COLUMN_NAME = 'id'
        `
      },
      {
        name: 'workflow_approvals.hire_id',
        query: `
          SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS c
          WHERE c.TABLE_NAME = 'workflow_approvals' AND c.COLUMN_NAME = 'hire_id'
        `
      },
      {
        name: 'workflow_approvals.approved_by',
        query: `
          SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS c
          WHERE c.TABLE_NAME = 'workflow_approvals' AND c.COLUMN_NAME = 'approved_by'
        `
      }
    ];
    
    for (const queryInfo of queries) {
      console.log(`\n📋 Checking ${queryInfo.name}:`);
      
      const result = await pool.request().query(queryInfo.query);
      
      if (result.recordset.length === 0) {
        console.log(`❌ Column not found`);
        continue;
      }
      
      const col = result.recordset[0];
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    }
    
    await pool.close();
    console.log('\n✅ ID columns check completed');
    
  } catch (error) {
    console.error('❌ ID columns check failed:', error.message);
    process.exit(1);
  }
}

checkIdColumns();