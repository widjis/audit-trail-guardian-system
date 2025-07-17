import { executeQuery } from '../src/server/utils/dbConnection.js';
import { authenticateHybrid, updateAuthConfig } from '../src/server/services/hybrid-auth.js';

async function testLocalModeAuth() {
  try {
    console.log('🧪 Testing Local Mode Authentication Fix\n');
    
    const username = 'widji.santoso@merdekabattery.com';
    const password = 'P@ssw0rd.123';
    
    // Set authentication mode to local
    console.log('1️⃣ Setting authentication mode to LOCAL...');
    await updateAuthConfig('local', false);
    console.log('✅ Mode set to local\n');
    
    // Test authentication
    console.log('2️⃣ Testing local authentication...');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    
    const authResult = await authenticateHybrid(username, password);
    
    if (authResult) {
      console.log('✅ LOCAL AUTHENTICATION SUCCESSFUL!');
      console.log('   Result:', {
        id: authResult.id,
        username: authResult.username,
        role: authResult.role,
        authenticationType: authResult.authenticationType
      });
    } else {
      console.log('❌ LOCAL AUTHENTICATION FAILED!');
    }
    
    console.log('\n3️⃣ Resetting to hybrid mode...');
    await updateAuthConfig('hybrid', true);
    console.log('✅ Mode reset to hybrid\n');
    
    console.log('🎯 Test completed!');
    process.exit(authResult ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLocalModeAuth();