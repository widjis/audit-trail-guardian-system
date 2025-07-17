import fetch from 'node-fetch';

async function testWebApiLogin() {
  const baseUrl = 'http://localhost:3000'; // Backend server URL
  
  console.log('🌐 Testing Web API Login Endpoint...\n');
  
  const testCases = [
    {
      name: 'Correct Password',
      username: 'widji.santoso@merdekabattery.com',
      password: 'P@ssw0rd.123',
      shouldSucceed: true
    },
    {
      name: 'Wrong Password',
      username: 'widji.santoso@merdekabattery.com',
      password: 'wrongpassword',
      shouldSucceed: false
    },
    {
      name: 'Wrong Password (Hybrid Mode)',
      username: 'widji.santoso@merdekabattery.com',
      password: 'wrongpassword',
      authMethod: 'auto',
      shouldSucceed: false
    },
    {
      name: 'Wrong Password (LDAP Mode)',
      username: 'widji.santoso@merdekabattery.com',
      password: 'wrongpassword',
      authMethod: 'ldap',
      shouldSucceed: false
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`🔐 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: testCase.username,
          password: testCase.password,
          authMethod: testCase.authMethod
        })
      });
      
      const result = await response.json();
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, result);
      
      if (testCase.shouldSucceed) {
        if (response.status === 200 && result.token) {
          console.log(`   Result: ✅ SUCCESS (as expected)`);
        } else {
          console.log(`   Result: ❌ FAILED (should have succeeded)`);
        }
      } else {
        if (response.status === 401 || response.status === 403) {
          console.log(`   Result: ✅ CORRECTLY FAILED (as expected)`);
        } else {
          console.log(`   Result: ❌ INCORRECTLY SUCCEEDED (should have failed)`);
        }
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      console.log(`   Result: ❌ REQUEST FAILED`);
    }
    
    console.log('');
  }
}

testWebApiLogin().catch(console.error);