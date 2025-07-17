import { executeQuery } from '../src/server/utils/dbConnection.js';
import { authenticateHybrid, getAuthConfig } from '../src/server/services/hybrid-auth.js';

async function testCurrentAuth() {
  try {
    console.log('🧪 Testing Current Authentication Issues\n');
    
    // Test with the user you're trying to log in with
    const username = 'widji.santoso@merdekabattery.com';
    const correctPassword = 'P@ssw0rd.123';
    const wrongPassword = 'wrongpassword';
    
    // Check current auth config
    const config = await getAuthConfig();
    console.log('📋 Current auth config:');
    console.log('   Mode:', config.authMode);
    console.log('   LDAP Fallback:', config.ldapFallbackEnabled);
    console.log();
    
    // Check user in database
    const users = await executeQuery(
      'SELECT username, authentication_type, password FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = users[0];
    console.log('👤 User info:');
    console.log('   Username:', user.username);
    console.log('   Auth Type:', user.authentication_type);
    console.log('   Has Password:', user.password ? 'Yes' : 'No');
    console.log('   Password Length:', user.password ? user.password.length : 0);
    console.log();
    
    // Test with correct password
    console.log('🔐 Testing with CORRECT password...');
    const correctResult = await authenticateHybrid(username, correctPassword);
    console.log('   Result:', correctResult ? '✅ SUCCESS' : '❌ FAILED');
    if (correctResult) {
      console.log('   Auth Type:', correctResult.authenticationType);
    }
    console.log();
    
    // Test with wrong password
    console.log('🔐 Testing with WRONG password...');
    const wrongResult = await authenticateHybrid(username, wrongPassword);
    console.log('   Result:', wrongResult ? '❌ INCORRECTLY SUCCEEDED' : '✅ CORRECTLY FAILED');
    if (wrongResult) {
      console.log('   Auth Type:', wrongResult.authenticationType);
      console.log('   ⚠️  This is a security issue!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCurrentAuth();