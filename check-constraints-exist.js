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
    
    // Check existing foreign key constraints
    console.log('\n📋 Checking existing foreign key constraints:');
    const constraintsQuery = `
      SELECT 
        fk.name AS CONSTRAINT_NAME,
        tp.name AS TABLE_NAME,
        cp.name AS COLUMN_NAME,
        tr.name AS REFERENCED_TABLE_NAME,
        cr.name AS REFERENCED_COLUMN_NAME
      FROM sys.foreign_keys fk
      INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
      INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
      WHERE tp.name = 'workflow_approvals'
      ORDER BY fk.name
    `;
    
    const constraintsResult = await pool.request().query(constraintsQuery);
    
    if (constraintsResult.recordset.length === 0) {
      console.log('❌ No foreign key constraints found for workflow_approvals table');
    } else {
      console.log('✅ Found foreign key constraints:');
      constraintsResult.recordset.forEach(constraint => {
        console.log(`  ${constraint.CONSTRAINT_NAME}: ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
      });
    }
    
    // Check specific constraints we're trying to create
    console.log('\n🔍 Checking specific constraints:');
    const specificConstraints = [
      'FK_workflow_approvals_hire_id',
      'FK_workflow_approvals_approved_by'
    ];
    
    for (const constraintName of specificConstraints) {
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM sys.foreign_keys 
        WHERE name = '${constraintName}'
      `;
      
      const result = await pool.request().query(checkQuery);
      const exists = result.recordset[0].count > 0;
      
      console.log(`  ${constraintName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    await pool.close();
    console.log('\n✅ Constraint check completed');
    
  } catch (error) {
    console.error('❌ Constraint check failed:', error.message);
    process.exit(1);
  }
}

checkConstraints();