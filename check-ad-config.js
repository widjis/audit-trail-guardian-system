import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  server: process.env.DB_HOST || '10.60.10.47',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'EmployeeWorkflow',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Bl4ck3y34dmin',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000
  }
};

async function checkAdConfig() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('Connected to database');
    
    const result = await pool.request()
      .query("SELECT * FROM system_configurations WHERE config_category = 'active_directory'");
    
    console.log('AD Configuration records found:', result.recordset.length);
    
    if (result.recordset.length > 0) {
      console.log('AD Configuration:');
      result.recordset.forEach(record => {
        console.log(`- ${record.config_key}: ${record.config_value || '[encrypted]'}`);
      });
    } else {
      console.log('No Active Directory configuration found in database');
    }
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAdConfig();