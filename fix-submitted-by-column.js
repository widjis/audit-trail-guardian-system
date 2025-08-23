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

async function fixSubmittedByColumn() {
  try {
    console.log('🔍 Connecting to database...');
    const pool = await sql.connect(config);
    
    console.log('🗑️ Dropping submitted_by column from hires table...');
    await pool.request().query(`
      IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hires' AND COLUMN_NAME = 'submitted_by')
      BEGIN
        ALTER TABLE hires DROP COLUMN submitted_by;
        PRINT 'submitted_by column dropped successfully';
      END
      ELSE
      BEGIN
        PRINT 'submitted_by column does not exist';
      END
    `);
    
    console.log('✅ Column dropped successfully');
    
    await pool.close();
    console.log('✅ Database operation completed');
    
  } catch (error) {
    console.error('❌ Fix submitted_by column failed:', error.message);
    process.exit(1);
  }
}

fixSubmittedByColumn();