import { executeQuery } from '../src/server/utils/dbConnection.js';
import bcrypt from 'bcrypt';

async function setUserPassword() {
  try {
    console.log('Setting password for test user...');
    
    const username = 'widji.santoso@merdekabattery.com';
    const password = 'P@ssw0rd.123';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user's password
    const updateResult = await executeQuery(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );
    
    console.log(`Password update result:`, updateResult);
    
    // Verify the user now has a password
    const user = await executeQuery(
      'SELECT username, authentication_type, role, password FROM users WHERE username = ?',
      [username]
    );
    
    if (user.length > 0) {
      console.log('User details after password update:');
      console.log(`- Username: ${user[0].username}`);
      console.log(`- Auth Type: ${user[0].authentication_type}`);
      console.log(`- Role: ${user[0].role}`);
      console.log(`- Has Password: ${user[0].password ? 'Yes' : 'No'}`);
      console.log(`- Password Length: ${user[0].password ? user[0].password.length : 0}`);
      
      // Test password verification
      const passwordMatch = await bcrypt.compare(password, user[0].password);
      console.log(`- Password Verification: ${passwordMatch ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log('User not found!');
    }
    
  } catch (error) {
    console.error('Error setting user password:', error);
  } finally {
    process.exit(0);
  }
}

setUserPassword();