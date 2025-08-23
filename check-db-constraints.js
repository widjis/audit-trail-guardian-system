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

async function checkConstraints() {
  try {
    console.log('🔍 Connecting to database...');
    const pool = await sql.connect(config);
    
    // Check if tables exist
    console.log('\n📊 Checking table existence:');
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('users', 'hires', 'workflow_approvals')
    `;
    const tablesResult = await pool.request().query(tablesQuery);
    console.log('Existing tables:', tablesResult.recordset.map(t => t.TABLE_NAME));
    
    // Check row counts
    console.log('\n📈 Checking row counts:');
    for (const table of tablesResult.recordset) {
      try {
        const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${table.TABLE_NAME}`);
        console.log(`${table.TABLE_NAME}: ${countResult.recordset[0].count} rows`);
      } catch (error) {
        console.log(`${table.TABLE_NAME}: Error getting count - ${error.message}`);
      }
    }
    
    // Check for orphaned records in workflow_approvals
    console.log('\n🔍 Checking for constraint violations:');
    try {
      const orphanedHires = await pool.request().query(`
        SELECT wa.hire_id, COUNT(*) as count
        FROM workflow_approvals wa
        LEFT JOIN hires h ON wa.hire_id = h.id
        WHERE h.id IS NULL
        GROUP BY wa.hire_id
      `);
      
      if (orphanedHires.recordset.length > 0) {
        console.log('❌ Found orphaned hire_id references in workflow_approvals:');
        orphanedHires.recordset.forEach(row => {
          console.log(`  hire_id: ${row.hire_id} (${row.count} records)`);
        });
      } else {
        console.log('✅ No orphaned hire_id references found');
      }
    } catch (error) {
      console.log('Could not check hire_id constraints:', error.message);
    }
    
    try {
      const orphanedUsers = await pool.request().query(`
        SELECT wa.approved_by, COUNT(*) as count
        FROM workflow_approvals wa
        LEFT JOIN users u ON wa.approved_by = u.id
        WHERE wa.approved_by IS NOT NULL AND u.id IS NULL
        GROUP BY wa.approved_by
      `);
      
      if (orphanedUsers.recordset.length > 0) {
        console.log('❌ Found orphaned approved_by references in workflow_approvals:');
        orphanedUsers.recordset.forEach(row => {
          console.log(`  approved_by: ${row.approved_by} (${row.count} records)`);
        });
      } else {
        console.log('✅ No orphaned approved_by references found');
      }
    } catch (error) {
      console.log('Could not check approved_by constraints:', error.message);
    }
    
    await pool.close();
    console.log('\n✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    process.exit(1);
  }
}

checkConstraints();