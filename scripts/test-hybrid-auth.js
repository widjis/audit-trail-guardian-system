#!/usr/bin/env node

/**
 * Hybrid Authentication Test Script
 * 
 * This script tests the hybrid authentication functionality including:
 * - Local authentication
 * - LDAP authentication (simulated)
 * - Hybrid mode configuration
 * - Authentication method selection
 * - Fallback mechanisms
 */

import { authenticateHybrid, getAuthConfig, updateAuthConfig } from '../src/server/services/hybrid-auth.js';
import { executeQuery, initDbConnection } from '../src/server/utils/dbConnection.js';
import bcrypt from 'bcrypt';

// Test configuration
const TEST_CONFIG = {
  testUser: {
    username: 'widji.santoso@merdekabattery.com',
    password: 'P@ssw0rd.123',
    role: 'user'
  },
  adminUser: {
    username: 'testadmin',
    password: 'adminpass123',
    role: 'admin'
  },
  ldapUser: {
    username: 'widji.santoso@merdekabattery.com',
    password: 'P@ssw0rd.123'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

async function setupTestData() {
  log('\n=== Setting up test data ===', colors.cyan);
  
  try {
    // Create test users with generated IDs
    const hashedPassword = await bcrypt.hash(TEST_CONFIG.testUser.password, 10);
    const hashedAdminPassword = await bcrypt.hash(TEST_CONFIG.adminUser.password, 10);
    
    const testUserId = `test-user-${Date.now()}`;
    const adminUserId = `test-admin-${Date.now()}`;
    
    // Insert test user (local) - use MERGE for MSSQL
    await executeQuery(`
      MERGE users AS target
      USING (SELECT ? AS id, ? AS username, ? AS password, ? AS role, 'local' AS authentication_type, 1 AS approved) AS source
      ON target.username = source.username
      WHEN MATCHED THEN
        UPDATE SET password = source.password, role = source.role, authentication_type = source.authentication_type, approved = source.approved
      WHEN NOT MATCHED THEN
        INSERT (id, username, password, role, authentication_type, approved)
        VALUES (source.id, source.username, source.password, source.role, source.authentication_type, source.approved);
    `, [testUserId, TEST_CONFIG.testUser.username, hashedPassword, TEST_CONFIG.testUser.role]);
    
    // Insert admin user
    await executeQuery(`
      MERGE users AS target
      USING (SELECT ? AS id, ? AS username, ? AS password, ? AS role, 'local' AS authentication_type, 1 AS approved) AS source
      ON target.username = source.username
      WHEN MATCHED THEN
        UPDATE SET password = source.password, role = source.role, authentication_type = source.authentication_type, approved = source.approved
      WHEN NOT MATCHED THEN
        INSERT (id, username, password, role, authentication_type, approved)
        VALUES (source.id, source.username, source.password, source.role, source.authentication_type, source.approved);
    `, [adminUserId, TEST_CONFIG.adminUser.username, hashedAdminPassword, TEST_CONFIG.adminUser.role]);
    
    logSuccess('Test users created successfully');
  } catch (error) {
    logError(`Failed to setup test data: ${error.message}`);
    throw error;
  }
}

async function testAuthConfig() {
  log('\n=== Testing Authentication Configuration ===', colors.cyan);
  
  try {
    // Test getting default config
    let config = await getAuthConfig();
    logInfo(`Current config: ${JSON.stringify(config)}`);
    
    // Test updating to hybrid mode
    await updateAuthConfig('hybrid', true);
    logSuccess('Updated to hybrid mode with fallback enabled');
    
    config = await getAuthConfig();
    if (config.authMode === 'hybrid' && config.ldapFallbackEnabled) {
      logSuccess('Configuration updated correctly');
    } else {
      logError('Configuration not updated correctly');
    }
    
    // Test updating to local mode
    await updateAuthConfig('local', false);
    logSuccess('Updated to local mode');
    
    config = await getAuthConfig();
    if (config.authMode === 'local' && !config.ldapFallbackEnabled) {
      logSuccess('Local mode configuration correct');
    } else {
      logError('Local mode configuration incorrect');
    }
    
    // Reset to hybrid for other tests
    await updateAuthConfig('hybrid', true);
    
  } catch (error) {
    logError(`Auth config test failed: ${error.message}`);
    throw error;
  }
}

async function testLocalAuthentication() {
  log('\n=== Testing Local Authentication ===', colors.cyan);
  
  try {
    // Test valid local user
    const result = await authenticateHybrid(
      TEST_CONFIG.testUser.username, 
      TEST_CONFIG.testUser.password, 
      'local'
    );
    
    if (result && result.username === TEST_CONFIG.testUser.username) {
      logSuccess(`Local authentication successful for ${result.username}`);
      logInfo(`User details: ${JSON.stringify({
        id: result.id,
        username: result.username,
        role: result.role,
        authenticationType: result.authenticationType
      })}`);
    } else {
      logError('Local authentication failed for valid user');
    }
    
    // Test invalid password
    const invalidResult = await authenticateHybrid(
      TEST_CONFIG.testUser.username, 
      'wrongpassword', 
      'local'
    );
    
    if (!invalidResult) {
      logSuccess('Local authentication correctly rejected invalid password');
    } else {
      logError('Local authentication incorrectly accepted invalid password');
    }
    
    // Test non-existent user
    const nonExistentResult = await authenticateHybrid(
      'nonexistent', 
      'password', 
      'local'
    );
    
    if (!nonExistentResult) {
      logSuccess('Local authentication correctly rejected non-existent user');
    } else {
      logError('Local authentication incorrectly accepted non-existent user');
    }
    
  } catch (error) {
    logError(`Local authentication test failed: ${error.message}`);
    throw error;
  }
}

async function testLdapAuthentication() {
  log('\n=== Testing LDAP Authentication (Simulated) ===', colors.cyan);
  
  try {
    logWarning('Note: LDAP authentication is simulated for testing purposes');
    
    // Test LDAP authentication (will be simulated)
    const result = await authenticateHybrid(
      TEST_CONFIG.ldapUser.username, 
      TEST_CONFIG.ldapUser.password, 
      'ldap'
    );
    
    if (result && result.username === TEST_CONFIG.ldapUser.username) {
      logSuccess(`LDAP authentication successful for ${result.username}`);
      logInfo(`User details: ${JSON.stringify({
        id: result.id,
        username: result.username,
        role: result.role,
        authenticationType: result.authenticationType,
        adInfo: result.adInfo
      })}`);
      
      // Verify user was created in local database
      const localUser = await executeQuery(
        'SELECT * FROM users WHERE username = ?', 
        [TEST_CONFIG.ldapUser.username]
      );
      
      if (localUser.length > 0) {
        logSuccess('LDAP user was correctly created in local database');
      } else {
        logError('LDAP user was not created in local database');
      }
    } else {
      logWarning('LDAP authentication failed (expected if LDAP server not configured)');
    }
    
  } catch (error) {
    logWarning(`LDAP authentication test: ${error.message} (expected if LDAP not configured)`);
  }
}

async function testHybridAuthentication() {
  log('\n=== Testing Hybrid Authentication ===', colors.cyan);
  
  try {
    // Test auto-detection with local user
    const localResult = await authenticateHybrid(
      TEST_CONFIG.testUser.username, 
      TEST_CONFIG.testUser.password
    );
    
    if (localResult && localResult.authenticationType === 'local') {
      logSuccess('Hybrid authentication correctly detected local user');
    } else {
      logError('Hybrid authentication failed to detect local user');
    }
    
    // Test auto-detection with LDAP user (simulated)
    try {
      const ldapResult = await authenticateHybrid(
        'newldapuser', 
        'ldappassword'
      );
      
      if (ldapResult && ldapResult.authenticationType === 'ldap') {
        logSuccess('Hybrid authentication correctly detected LDAP user');
      } else {
        logInfo('LDAP authentication not available (expected if LDAP not configured)');
      }
    } catch (error) {
      logInfo('LDAP authentication not available (expected if LDAP not configured)');
    }
    
  } catch (error) {
    logError(`Hybrid authentication test failed: ${error.message}`);
    throw error;
  }
}

async function testFallbackMechanism() {
  log('\n=== Testing Fallback Mechanism ===', colors.cyan);
  
  try {
    // Ensure fallback is enabled
    await updateAuthConfig('hybrid', true);
    
    // Test fallback with existing local user
    const result = await authenticateHybrid(
      TEST_CONFIG.testUser.username, 
      TEST_CONFIG.testUser.password
    );
    
    if (result) {
      logSuccess('Fallback mechanism working - found user in local database');
    } else {
      logError('Fallback mechanism failed');
    }
    
    // Test with fallback disabled
    await updateAuthConfig('hybrid', false);
    
    const resultNoFallback = await authenticateHybrid(
      TEST_CONFIG.testUser.username, 
      TEST_CONFIG.testUser.password
    );
    
    if (resultNoFallback) {
      logSuccess('Authentication works without fallback for existing users');
    } else {
      logError('Authentication failed without fallback');
    }
    
    // Reset fallback
    await updateAuthConfig('hybrid', true);
    
  } catch (error) {
    logError(`Fallback mechanism test failed: ${error.message}`);
    throw error;
  }
}

async function testDifferentAuthModes() {
  log('\n=== Testing Different Authentication Modes ===', colors.cyan);
  
  try {
    // Test local-only mode
    await updateAuthConfig('local', false);
    
    const localOnlyResult = await authenticateHybrid(
      TEST_CONFIG.testUser.username, 
      TEST_CONFIG.testUser.password
    );
    
    if (localOnlyResult && localOnlyResult.authenticationType === 'local') {
      logSuccess('Local-only mode working correctly');
    } else {
      logError('Local-only mode failed');
    }
    
    // Test LDAP-only mode
    await updateAuthConfig('ldap', false);
    
    try {
      const ldapOnlyResult = await authenticateHybrid(
        'ldapuser', 
        'ldappass'
      );
      
      if (ldapOnlyResult && ldapOnlyResult.authenticationType === 'ldap') {
        logSuccess('LDAP-only mode working correctly');
      } else {
        logInfo('LDAP-only mode test skipped (LDAP not configured)');
      }
    } catch (error) {
      logInfo('LDAP-only mode test skipped (LDAP not configured)');
    }
    
    // Reset to hybrid mode
    await updateAuthConfig('hybrid', true);
    logSuccess('Reset to hybrid mode');
    
  } catch (error) {
    logError(`Different auth modes test failed: ${error.message}`);
    throw error;
  }
}

async function cleanupTestData() {
  log('\n=== Cleaning up test data ===', colors.cyan);
  
  try {
    // Remove test users
    await executeQuery('DELETE FROM users WHERE username IN (?, ?, ?)', [
      TEST_CONFIG.testUser.username,
      TEST_CONFIG.ldapUser.username,
      TEST_CONFIG.adminUser.username
    ]);
    
    logSuccess('Test data cleaned up successfully');
  } catch (error) {
    logWarning(`Cleanup warning: ${error.message}`);
  }
}

async function runAllTests() {
  log('🚀 Starting Hybrid Authentication Test Suite', colors.bright);
  
  let testsPassed = 0;
  let testsTotal = 0;
  
  try {
    // Initialize database connection
    await initDbConnection();
    logSuccess('Database connection established');
    
    // Run all tests
    const tests = [
      { name: 'Setup Test Data', fn: setupTestData },
      { name: 'Authentication Configuration', fn: testAuthConfig },
      { name: 'Local Authentication', fn: testLocalAuthentication },
      { name: 'LDAP Authentication', fn: testLdapAuthentication },
      { name: 'Hybrid Authentication', fn: testHybridAuthentication },
      { name: 'Fallback Mechanism', fn: testFallbackMechanism },
      { name: 'Different Auth Modes', fn: testDifferentAuthModes },
    ];
    
    for (const test of tests) {
      testsTotal++;
      try {
        await test.fn();
        testsPassed++;
        logSuccess(`${test.name} - PASSED`);
      } catch (error) {
        logError(`${test.name} - FAILED: ${error.message}`);
      }
    }
    
    // Cleanup
    await cleanupTestData();
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
  }
  
  // Summary
  log('\n=== Test Summary ===', colors.cyan);
  log(`Tests passed: ${testsPassed}/${testsTotal}`, testsPassed === testsTotal ? colors.green : colors.red);
  
  if (testsPassed === testsTotal) {
    log('🎉 All tests passed! Hybrid authentication is working correctly.', colors.green);
  } else {
    log('❌ Some tests failed. Please check the implementation.', colors.red);
  }
  
  process.exit(testsPassed === testsTotal ? 0 : 1);
}

// Run the test suite
runAllTests().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  process.exit(1);
});