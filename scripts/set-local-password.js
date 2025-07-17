import { executeQuery } from '../src/server/utils/dbConnection.js';
import bcrypt from 'bcrypt';

async function setLocalPassword() {
  try {
    const username = 'widji.santoso@merdekabattery.com';
    const password = 'P@ssw0rd.123';
    
    console.log(`🔐 Setting local password for user: ${username}`);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user's password
    const result = await executeQuery(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );
    
    console.log('✅ Password updated successfully');
    console.log(`   - User: ${username}`);
    console.log(`   - Rows affected: ${result.rowsAffected || 'N/A'}`);
    
    // Verify the update
    const user = await executeQuery('SELECT username, authentication_type, role FROM users WHERE username = ?', [username]);
    console.log('\n📋 User details after update:');
    console.log('  ', user[0]);
    
    console.log('\n🎯 Now you can test local authentication with:');
    console.log(`   - Username: ${username}`);
    console.log(`   - Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setLocalPassword();