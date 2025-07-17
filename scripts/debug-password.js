import { executeQuery } from '../src/server/utils/dbConnection.js';
import bcrypt from 'bcrypt';

async function debugUserPassword() {
  try {
    console.log('🔍 Debugging user password data\n');
    
    const username = 'test.support';
    const testPassword = 'password123';
    
    // Get user data
    const users = await executeQuery(
      'SELECT id, username, password, authentication_type, role FROM users WHERE username = ?', 
      [username]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const user = users[0];
    console.log('👤 User data:');
    console.log('   ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Auth Type:', user.authentication_type);
    console.log('   Role:', user.role);
    console.log('   Password length:', user.password ? user.password.length : 0);
    console.log('   Password starts with:', user.password ? user.password.substring(0, 10) + '...' : 'null/empty');
    
    if (!user.password || user.password === '') {
      console.log('❌ User has no password set!');
      return;
    }
    
    // Test password comparison
    console.log('\n🔐 Testing password comparison...');
    console.log('   Test password:', testPassword);
    
    try {
      const passwordMatch = await bcrypt.compare(testPassword, user.password);
      console.log('   Password match:', passwordMatch ? '✅ YES' : '❌ NO');
      
      if (!passwordMatch) {
        // Try to hash the test password and compare
        const hashedTest = await bcrypt.hash(testPassword, 10);
        console.log('   Test password hashed:', hashedTest.substring(0, 20) + '...');
        console.log('   Stored password:     ', user.password.substring(0, 20) + '...');
      }
    } catch (error) {
      console.log('   ❌ Error comparing passwords:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugUserPassword();