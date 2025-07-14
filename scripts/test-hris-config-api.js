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
  username: 'admin', // Replace with actual admin username
  password: 'admin'  // Replace with actual admin password
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
 * Test HRIS configuration API endpoints
 */
async function testHrisConfigAPI() {
  console.log('🧪 Testing HRIS Configuration API Endpoints\n');
  
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
    // Test 1: Get HRIS configuration
    console.log('2. Testing GET /api/system-config/hris...');
    const getResponse = await fetch(`${API_BASE_URL}/system-config/hris`, {
      method: 'GET',
      headers
    });
    
    if (getResponse.ok) {
      const hrisConfig = await getResponse.json();
      console.log('✅ HRIS configuration retrieved successfully');
      console.log('📋 Current HRIS config:', JSON.stringify(hrisConfig, null, 2));
    } else {
      console.log(`❌ Failed to get HRIS config: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    console.log();
    
    // Test 2: Get all configuration categories
    console.log('3. Testing GET /api/system-config/categories...');
    const categoriesResponse = await fetch(`${API_BASE_URL}/system-config/categories`, {
      method: 'GET',
      headers
    });
    
    if (categoriesResponse.ok) {
      const categories = await categoriesResponse.json();
      console.log('✅ Configuration categories retrieved successfully');
      console.log('📋 Available categories:', categories);
    } else {
      console.log(`❌ Failed to get categories: ${categoriesResponse.status} ${categoriesResponse.statusText}`);
    }
    
    console.log();
    
    // Test 3: Get HRIS category configurations
    console.log('4. Testing GET /api/system-config/category/hris...');
    const hrisCategoryResponse = await fetch(`${API_BASE_URL}/system-config/category/hris`, {
      method: 'GET',
      headers
    });
    
    if (hrisCategoryResponse.ok) {
      const hrisCategoryConfigs = await hrisCategoryResponse.json();
      console.log('✅ HRIS category configurations retrieved successfully');
      console.log('📋 HRIS configurations count:', hrisCategoryConfigs.length);
    } else {
      console.log(`❌ Failed to get HRIS category configs: ${hrisCategoryResponse.status} ${hrisCategoryResponse.statusText}`);
    }
    
    console.log();
    
    // Test 4: Test HRIS connection
    console.log('5. Testing POST /api/system-config/hris/test-connection...');
    const testConnectionResponse = await fetch(`${API_BASE_URL}/system-config/hris/test-connection`, {
      method: 'POST',
      headers
    });
    
    if (testConnectionResponse.ok) {
      const connectionResult = await testConnectionResponse.json();
      console.log('✅ HRIS connection test completed');
      console.log('📋 Connection result:', JSON.stringify(connectionResult, null, 2));
    } else {
      console.log(`❌ Failed to test HRIS connection: ${testConnectionResponse.status} ${testConnectionResponse.statusText}`);
    }
    
    console.log();
    console.log('🎉 HRIS Configuration API testing completed!');
    
  } catch (error) {
    console.error('❌ Error during API testing:', error.message);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('test-hris-config-api.js')) {
  testHrisConfigAPI().catch(console.error);
}

export default testHrisConfigAPI;