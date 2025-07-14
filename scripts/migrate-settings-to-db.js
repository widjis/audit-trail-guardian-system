import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const ENV_FILE_PATH = path.join(__dirname, '../.env');
if (fs.existsSync(ENV_FILE_PATH)) {
  dotenv.config({ path: ENV_FILE_PATH });
  console.log('✅ Environment variables loaded from .env');
} else {
  console.error('❌ .env file not found at:', ENV_FILE_PATH);
  process.exit(1);
}

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

// Load settings.json
function loadSettings() {
  const settingsPath = path.join(__dirname, '..', 'src', 'server', 'data', 'settings.json');
  const settingsData = fs.readFileSync(settingsPath, 'utf8');
  return JSON.parse(settingsData);
}

// Migrate account statuses
async function migrateAccountStatuses(pool, accountStatuses) {
  console.log('Migrating account statuses...');
  
  for (let i = 0; i < accountStatuses.length; i++) {
    const status = accountStatuses[i];
    const id = uuidv4();
    
    try {
      await pool.request()
        .input('id', sql.VarChar, id)
        .input('name', sql.VarChar, status)
        .input('sort_order', sql.Int, i)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM account_statuses WHERE name = @name)
          BEGIN
            INSERT INTO account_statuses (id, name, sort_order)
            VALUES (@id, @name, @sort_order)
          END
        `);
      
      console.log(`✓ Migrated account status: ${status}`);
    } catch (error) {
      console.error(`✗ Failed to migrate account status '${status}':`, error.message);
    }
  }
}

// Migrate position grades
async function migratePositionGrades(pool, positionGrades) {
  console.log('Migrating position grades...');
  
  for (let i = 0; i < positionGrades.length; i++) {
    const grade = positionGrades[i];
    const id = uuidv4();
    
    try {
      await pool.request()
        .input('id', sql.VarChar, id)
        .input('name', sql.VarChar, grade)
        .input('sort_order', sql.Int, i)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM position_grades WHERE name = @name)
          BEGIN
            INSERT INTO position_grades (id, name, sort_order)
            VALUES (@id, @name, @sort_order)
          END
        `);
      
      console.log(`✓ Migrated position grade: ${grade}`);
    } catch (error) {
      console.error(`✗ Failed to migrate position grade '${grade}':`, error.message);
    }
  }
}

// Migrate mailing lists
async function migrateMailingLists(pool, mailingLists) {
  console.log('Migrating mailing lists...');
  
  const types = ['mandatory', 'optional', 'roleBased'];
  
  for (const type of types) {
    if (mailingLists[type] && Array.isArray(mailingLists[type])) {
      const dbType = type === 'roleBased' ? 'role-based' : type;
      
      for (let i = 0; i < mailingLists[type].length; i++) {
        const list = mailingLists[type][i];
        const id = uuidv4();
        
        try {
          await pool.request()
            .input('id', sql.VarChar, id)
            .input('name', sql.VarChar, list.name)
            .input('email', sql.VarChar, list.email)
            .input('type', sql.VarChar, dbType)
            .input('sort_order', sql.Int, i)
            .query(`
              IF NOT EXISTS (SELECT 1 FROM mailing_lists WHERE name = @name AND type = @type)
              BEGIN
                INSERT INTO mailing_lists (id, name, email, type, sort_order)
                VALUES (@id, @name, @email, @type, @sort_order)
              END
            `);
          
          console.log(`✓ Migrated ${dbType} mailing list: ${list.name} (${list.email})`);
        } catch (error) {
          console.error(`✗ Failed to migrate mailing list '${list.name}':`, error.message);
        }
      }
    }
  }
}

// Main migration function
async function migrate() {
  let pool;
  
  try {
    console.log('Starting settings migration to database...');
    
    // Load settings
    const settings = loadSettings();
    
    // Connect to database
    pool = await sql.connect(dbConfig);
    console.log('✓ Connected to database');
    
    // Run migrations
    if (settings.accountStatuses) {
      await migrateAccountStatuses(pool, settings.accountStatuses);
    }
    
    if (settings.positionGrades) {
      await migratePositionGrades(pool, settings.positionGrades);
    }
    
    if (settings.mailingLists) {
      await migrateMailingLists(pool, settings.mailingLists);
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the data in your database');
    console.log('2. Test the updated API endpoints');
    console.log('3. Update settings.js to use database queries');
    
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run migration if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                    import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
  migrate().catch(console.error);
}

export { migrate };