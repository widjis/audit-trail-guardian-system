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

async function checkMailingLists() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(dbConfig);
    console.log('✓ Connected to database');
    
    // Query all mailing lists
    const result = await pool.request().query('SELECT * FROM mailing_lists ORDER BY type, sort_order');
    
    console.log(`\nFound ${result.recordset.length} mailing lists in database:`);
    console.log('='.repeat(80));
    
    const grouped = {
      mandatory: [],
      optional: [],
      'role-based': []
    };
    
    result.recordset.forEach(row => {
      grouped[row.type] = grouped[row.type] || [];
      grouped[row.type].push(row);
      console.log(`${row.type.toUpperCase()}: ${row.name} (${row.email}) - Active: ${row.is_active}`);
    });
    
    console.log('\nSummary:');
    console.log(`- Mandatory: ${grouped.mandatory.length}`);
    console.log(`- Optional: ${grouped.optional.length}`);
    console.log(`- Role-based: ${grouped['role-based'].length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkMailingLists().catch(console.error);