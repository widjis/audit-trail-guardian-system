import { executeQuery } from '../src/server/utils/dbConnection.js';
import bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    console.log('👤 Creating test user for web interface testing\n');
    
    const username = 'widji.santoso@merdekabattery.com';
    const password = 'P@ssw0rd.123';
    const userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Check if user already exists
    const existingUsers = await executeQuery(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsers.length > 0) {
      console.log('ℹ️ User already exists, updating password...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update the user's password
      await executeQuery(
        'UPDATE users SET password = ?, authentication_type = ? WHERE username = ?',
        [hashedPassword, 'local', username]
      );
      
      console.log('✅ User password updated successfully');
    } else {
      console.log('➕ Creating new user...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create the user
      await executeQuery(
        'INSERT INTO users (id, username, password, role, authentication_type, approved) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, hashedPassword, 'support', 'local', 1]
      );
      
      console.log('✅ User created successfully');
    }
    
    console.log('📋 User details:');
    console.log('   Username:', username);
    console.log('   Password:', password);
    console.log('   Auth Type: local');
    console.log('   Role: support');
    
    // Verify the user
    const users = await executeQuery(
      'SELECT username, authentication_type, role FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length > 0) {
      console.log('✅ Verification: User found in database');
      console.log('   Auth Type:', users[0].authentication_type);
      console.log('   Role:', users[0].role);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();