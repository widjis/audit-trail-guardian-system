import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Database configuration
let server = process.env.DB_HOST;
if (process.env.DB_INSTANCE) {
  server = `${process.env.DB_HOST}\\${process.env.DB_INSTANCE}`;
}

const dbConfig = {
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

async function activateMailingLists() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(dbConfig);
    console.log('✓ Connected to database');
    
    // First, deactivate the test record
    await pool.request().query("UPDATE mailing_lists SET is_active = 0 WHERE name = 'Test List'");
    console.log('✓ Deactivated test record');
    
    // Activate all migrated mailing lists (exclude the test record)
    const result = await pool.request().query("UPDATE mailing_lists SET is_active = 1 WHERE name != 'Test List'");
    
    console.log(`✓ Activated ${result.rowsAffected[0]} mailing lists`);
    
    // Verify the update
    const activeCount = await pool.request().query('SELECT COUNT(*) as count FROM mailing_lists WHERE is_active = 1');
    console.log(`✓ Total active mailing lists: ${activeCount.recordset[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

activateMailingLists().catch(console.error);