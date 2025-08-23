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

async function checkSubmittedByColumn() {
  try {
    console.log('🔍 Connecting to database...');
    const pool = await sql.connect(config);
    
    // Check if submitted_by column exists in hires table
    console.log('\n📋 Checking hires.submitted_by column:');
    const submittedByQuery = `
      SELECT 
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_NAME = 'hires' AND c.COLUMN_NAME = 'submitted_by'
    `;
    
    const submittedByResult = await pool.request().query(submittedByQuery);
    
    if (submittedByResult.recordset.length === 0) {
      console.log('❌ submitted_by column not found in hires table');
    } else {
      const col = submittedByResult.recordset[0];
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    }
    
    // Check users.id column for comparison
    console.log('\n📋 Checking users.id column:');
    const usersIdQuery = `
      SELECT 
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_NAME = 'users' AND c.COLUMN_NAME = 'id'
    `;
    
    const usersIdResult = await pool.request().query(usersIdQuery);
    
    if (usersIdResult.recordset.length > 0) {
      const col = usersIdResult.recordset[0];
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    }
    
    // Check if FK_hires_submitted_by constraint already exists
    console.log('\n🔍 Checking FK_hires_submitted_by constraint:');
    const constraintQuery = `
      SELECT COUNT(*) as count
      FROM sys.foreign_keys 
      WHERE name = 'FK_hires_submitted_by'
    `;
    
    const constraintResult = await pool.request().query(constraintQuery);
    const exists = constraintResult.recordset[0].count > 0;
    
    console.log(`  FK_hires_submitted_by: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    
    await pool.close();
    console.log('\n✅ submitted_by column check completed');
    
  } catch (error) {
    console.error('❌ submitted_by column check failed:', error.message);
    process.exit(1);
  }
}

checkSubmittedByColumn();