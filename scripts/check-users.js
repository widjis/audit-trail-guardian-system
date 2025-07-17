import { executeQuery } from '../src/server/utils/dbConnection.js';

async function checkUsers() {
  try {
    console.log('🔍 Checking users table...\n');
    
    // Check if authentication_type column exists
    const columnCheck = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'authentication_type'
    `);
    
    console.log('📋 authentication_type column info:', columnCheck);
    
    // Check existing users
    const users = await executeQuery('SELECT username, authentication_type, role FROM users');
    console.log('\n👥 Existing users:');
    users.forEach(user => {
      console.log(`  - ${user.username}: auth_type=${user.authentication_type || 'NULL'}, role=${user.role}`);
    });
    
    // Check specific test user
    const testUser = await executeQuery('SELECT * FROM users WHERE username = ?', ['widji.santoso@merdekabattery.com']);
    console.log('\n🧪 Test user details:');
    if (testUser.length > 0) {
      console.log('  - Found:', testUser[0]);
    } else {
      console.log('  - Not found');
    }
    
    console.log('\n✅ Check completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();