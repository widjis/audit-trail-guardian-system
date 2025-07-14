import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const ENV_FILE_PATH = path.join(__dirname, '../.env');
if (fs.existsSync(ENV_FILE_PATH)) {
  dotenv.config({ path: ENV_FILE_PATH });
}

const API_BASE_URL = 'http://localhost:3001/api';

// Test credentials (you'll need to replace with actual admin credentials)
const TEST_CREDENTIALS = {
  username: 'widji.santoso@merdekabattery.com', // Replace with actual admin username
  password: 'P@ssw0rd.123'  // Replace with actual admin password
};

/**
 * Get authentication token
 */
async function getAuthToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error.message);
    return null;
  }
}

/**
 * Test Active Directory configuration API endpoints
 */
async function testActiveDirectoryConfigAPI() {
  console.log('🧪 Testing Active Directory Configuration API Endpoints\n');
  
  // Get authentication token
  console.log('1. Getting authentication token...');
  const token = await getAuthToken();
  
  if (!token) {
    console.log('❌ Cannot proceed without authentication token');
    console.log('💡 Please ensure you have valid admin credentials in the script');
    return;
  }
  
  console.log('✅ Authentication successful\n');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test 1: Get Active Directory configuration
    console.log('2. Testing GET /api/system-config/active-directory...');
    const getResponse = await fetch(`${API_BASE_URL}/system-config/active-directory`, {
      method: 'GET',
      headers
    });
    
    if (getResponse.ok) {
      const adConfig = await getResponse.json();
      console.log('✅ Active Directory configuration retrieved successfully');
      console.log('📋 Current AD config:', JSON.stringify(adConfig, null, 2));
    } else {
      const errorText = await getResponse.text();
      console.log(`❌ Failed to get AD config: ${getResponse.status} ${getResponse.statusText}`);
      console.log('📋 Error details:', errorText);
    }
    
    console.log();
    
    // Test 2: Get Active Directory category configurations
    console.log('3. Testing GET /api/system-config/category/active_directory...');
    const adCategoryResponse = await fetch(`${API_BASE_URL}/system-config/category/active_directory`, {
      method: 'GET',
      headers
    });
    
    if (adCategoryResponse.ok) {
      const adCategoryConfigs = await adCategoryResponse.json();
      console.log('✅ Active Directory category configurations retrieved successfully');
      console.log('📋 AD configurations count:', adCategoryConfigs.length);
      console.log('📋 Configuration keys:', adCategoryConfigs.map(c => c.config_key));
    } else {
      const errorText = await adCategoryResponse.text();
      console.log(`❌ Failed to get AD category configs: ${adCategoryResponse.status} ${adCategoryResponse.statusText}`);
      console.log('📋 Error details:', errorText);
    }
    
    console.log();
    
    // Test 3: Test Active Directory connection
    console.log('4. Testing POST /api/system-config/active-directory/test-connection...');
    const testConnectionResponse = await fetch(`${API_BASE_URL}/system-config/active-directory/test-connection`, {
      method: 'POST',
      headers
    });
    
    if (testConnectionResponse.ok) {
      const connectionResult = await testConnectionResponse.json();
      console.log('✅ Active Directory connection test completed');
      console.log('📋 Connection result:', JSON.stringify(connectionResult, null, 2));
    } else {
      const errorText = await testConnectionResponse.text();
      console.log(`❌ Failed to test AD connection: ${testConnectionResponse.status} ${testConnectionResponse.statusText}`);
      console.log('📋 Error details:', errorText);
    }
    
    console.log();
    
    // Test 4: Update Active Directory configuration (optional test)
    console.log('5. Testing PUT /api/system-config/active-directory (dry run)...');
    console.log('💡 Skipping update test to avoid modifying production config');
    console.log('💡 To test updates, uncomment the update test section in the script');
    
    /*
    // Uncomment this section to test configuration updates
    const updateData = {
      server: '10.60.10.56',
      username: 'CN=MTI SysAdmin,OU=Testing Environment,OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com',
      domain: 'mbma.com',
      baseDN: 'OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com',
      protocol: 'ldaps',
      authFormat: 'dn',
      enabled: true
      // Note: password is optional in updates
    };
    
    const updateResponse = await fetch(`${API_BASE_URL}/system-config/active-directory`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('✅ Active Directory configuration updated successfully');
      console.log('📋 Update result:', JSON.stringify(updateResult, null, 2));
    } else {
      console.log(`❌ Failed to update AD config: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    */
    
    console.log();
    
    // Test 5: Get specific AD configuration by key
    console.log('6. Testing GET /api/system-config/ad.server...');
    const serverConfigResponse = await fetch(`${API_BASE_URL}/system-config/ad.server`, {
      method: 'GET',
      headers
    });
    
    if (serverConfigResponse.ok) {
      const serverConfig = await serverConfigResponse.json();
      console.log('✅ AD server configuration retrieved successfully');
      console.log('📋 Server config:', JSON.stringify(serverConfig, null, 2));
    } else {
      console.log(`❌ Failed to get AD server config: ${serverConfigResponse.status} ${serverConfigResponse.statusText}`);
    }
    
    console.log();
    console.log('🎉 Active Directory Configuration API testing completed!');
    
  } catch (error) {
    console.error('❌ Error during API testing:', error.message);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('test-ad-config-api.js')) {
  testActiveDirectoryConfigAPI().catch(console.error);
}

export default testActiveDirectoryConfigAPI;