import { executeQuery } from '../src/server/utils/dbConnection.js';
import bcrypt from 'bcrypt';

async function setTestUserPassword() {
  try {
    console.log('🔧 Setting password for test.support user\n');
    
    const username = 'test.support';
    const newPassword = 'password123';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Password hashed successfully');
    
    // Update the user's password
    const result = await executeQuery(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );
    
    console.log('✅ Password updated successfully for', username);
    console.log('   New password:', newPassword);
    
    // Verify the update
    const users = await executeQuery(
      'SELECT username, password FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length > 0) {
      console.log('✅ Verification: User found with updated password');
      
      // Test the password
      const passwordMatch = await bcrypt.compare(newPassword, users[0].password);
      console.log('✅ Password verification:', passwordMatch ? 'PASSED' : 'FAILED');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setTestUserPassword();