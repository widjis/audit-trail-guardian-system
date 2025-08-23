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

async function fixWorkflowTable() {
  try {
    console.log('🔍 Connecting to database...');
    const pool = await sql.connect(config);
    
    console.log('🗑️ Dropping workflow_approvals table...');
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='workflow_approvals' AND xtype='U')
      BEGIN
        DROP TABLE workflow_approvals;
        PRINT 'workflow_approvals table dropped successfully';
      END
      ELSE
      BEGIN
        PRINT 'workflow_approvals table does not exist';
      END
    `);
    
    console.log('✅ Table dropped successfully');
    
    await pool.close();
    console.log('✅ Database operation completed');
    
  } catch (error) {
    console.error('❌ Fix workflow table failed:', error.message);
    process.exit(1);
  }
}

fixWorkflowTable();