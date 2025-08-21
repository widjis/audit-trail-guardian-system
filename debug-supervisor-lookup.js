#!/usr/bin/env node

// Debug script to investigate supervisor lookup issues
// Usage: node debug-supervisor-lookup.js [employeeId1] [employeeId2] ...

import { fileURLToPath } from 'url';
import path from 'path';
import { getDbPool } from './src/server/utils/dbConnection.js';
import { search as ldapSearch, getDnFromEmployeeId as ldapGetDn } from './src/server/lib/ldapService.js';
import SystemConfigService from './src/server/services/system-config-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get employee IDs from command line arguments
const employeeIds = process.argv.slice(2);

if (employeeIds.length === 0) {
  console.log('Usage: node debug-supervisor-lookup.js [employeeId1] [employeeId2] ...');
  console.log('Example: node debug-supervisor-lookup.js MT1240845 MT1230185');
  process.exit(1);
}

async function debugSupervisorLookup() {
  try {
    console.log('🔍 Starting Supervisor Lookup Debug');
    console.log('=====================================\n');

    // Initialize database connection
    const dbPool = getDbPool();
    const systemConfig = new SystemConfigService(dbPool);
    const ad = await systemConfig.getActiveDirectoryConfig();
    
    console.log(`📋 AD Configuration:`);
    console.log(`   Server: ${ad.server}`);
    console.log(`   Base DN: ${ad.baseDN}`);
    console.log(`   Domain: ${ad.domain}\n`);

    for (const employeeId of employeeIds) {
      console.log(`\n🔍 Debugging Employee: ${employeeId}`);
      console.log('='.repeat(50));

      // 1. Get employee data from HRIS database
      const hrisQuery = `
        SELECT 
          employee_id,
          employee_name,
          supervisor_id,
          department,
          position_title
        FROM [dbo].[MTIUsers] 
        WHERE employee_id = @employeeId
      `;

      const hrisResult = await dbPool.request()
        .input('employeeId', employeeId)
        .query(hrisQuery);

      if (hrisResult.recordset.length === 0) {
        console.log(`❌ Employee ${employeeId} not found in HRIS database`);
        continue;
      }

      const hrisEmployee = hrisResult.recordset[0];
      console.log(`📊 HRIS Data:`);
      console.log(`   Name: ${hrisEmployee.employee_name}`);
      console.log(`   Department: ${hrisEmployee.department}`);
      console.log(`   Title: ${hrisEmployee.position_title}`);
      console.log(`   Supervisor ID: ${hrisEmployee.supervisor_id || 'None'}`);

      // 2. Check if employee exists in AD
      console.log(`\n🔍 Checking Employee in AD:`);
      const employeeFilter = `(&(objectClass=user)(employeeID=${employeeId}))`;
      const employeeAdResults = await ldapSearch(ad.baseDN, employeeFilter, [
        'distinguishedName', 'displayName', 'employeeID', 'manager', 'department', 'title'
      ]);

      if (employeeAdResults.length === 0) {
        console.log(`❌ Employee ${employeeId} not found in AD`);
        continue;
      }

      const adEmployee = employeeAdResults[0];
      console.log(`✅ Found in AD:`);
      console.log(`   DN: ${adEmployee.distinguishedName}`);
      console.log(`   Display Name: ${adEmployee.displayName}`);
      console.log(`   Current Manager: ${adEmployee.manager || 'None'}`);

      // 3. Check supervisor lookup if supervisor_id exists
      if (hrisEmployee.supervisor_id) {
        console.log(`\n🔍 Checking Supervisor Lookup:`);
        console.log(`   Looking up supervisor ID: ${hrisEmployee.supervisor_id}`);

        // Method 1: Direct DN lookup using the service function
        try {
          const supervisorDN = await ldapGetDn(hrisEmployee.supervisor_id);
          if (supervisorDN) {
            console.log(`✅ Supervisor DN found: ${supervisorDN}`);
          } else {
            console.log(`❌ Supervisor DN not found for ID: ${hrisEmployee.supervisor_id}`);
          }
        } catch (error) {
          console.log(`❌ Error looking up supervisor DN: ${error.message}`);
        }

        // Method 2: Direct LDAP search for supervisor
        console.log(`\n🔍 Direct AD Search for Supervisor:`);
        const supervisorFilter = `(&(objectClass=user)(employeeID=${hrisEmployee.supervisor_id}))`;
        try {
          const supervisorResults = await ldapSearch(ad.baseDN, supervisorFilter, [
            'distinguishedName', 'displayName', 'employeeID', 'sAMAccountName'
          ]);

          if (supervisorResults.length > 0) {
            console.log(`✅ Supervisor found in AD:`);
            supervisorResults.forEach((supervisor, index) => {
              console.log(`   Result ${index + 1}:`);
              console.log(`     DN: ${supervisor.distinguishedName}`);
              console.log(`     Display Name: ${supervisor.displayName}`);
              console.log(`     Employee ID: ${supervisor.employeeID}`);
              console.log(`     Username: ${supervisor.sAMAccountName}`);
            });
          } else {
            console.log(`❌ Supervisor with ID ${hrisEmployee.supervisor_id} not found in AD`);
          }
        } catch (error) {
          console.log(`❌ Error searching for supervisor: ${error.message}`);
        }

        // Method 3: Fuzzy search for supervisor by name
        console.log(`\n🔍 Fuzzy Search for Supervisor:`);
        try {
          // Get supervisor name from HRIS
          const supervisorQuery = `
            SELECT employee_name 
            FROM [dbo].[MTIUsers] 
            WHERE employee_id = @supervisorId
          `;
          
          const supervisorHrisResult = await dbPool.request()
            .input('supervisorId', hrisEmployee.supervisor_id)
            .query(supervisorQuery);

          if (supervisorHrisResult.recordset.length > 0) {
            const supervisorName = supervisorHrisResult.recordset[0].employee_name;
            console.log(`   Supervisor name in HRIS: ${supervisorName}`);

            // Search AD by display name
            const nameFilter = `(&(objectClass=user)(displayName=*${supervisorName}*))`;
            const nameResults = await ldapSearch(ad.baseDN, nameFilter, [
              'distinguishedName', 'displayName', 'employeeID', 'sAMAccountName'
            ]);

            if (nameResults.length > 0) {
              console.log(`✅ Found potential matches by name:`);
              nameResults.forEach((match, index) => {
                console.log(`   Match ${index + 1}:`);
                console.log(`     DN: ${match.distinguishedName}`);
                console.log(`     Display Name: ${match.displayName}`);
                console.log(`     Employee ID: ${match.employeeID || 'Not set'}`);
                console.log(`     Username: ${match.sAMAccountName}`);
              });
            } else {
              console.log(`❌ No matches found by supervisor name`);
            }
          } else {
            console.log(`❌ Supervisor ${hrisEmployee.supervisor_id} not found in HRIS database`);
          }
        } catch (error) {
          console.log(`❌ Error in fuzzy search: ${error.message}`);
        }

        // Method 4: Check if supervisor has different employee ID format
        console.log(`\n🔍 Checking Alternative ID Formats:`);
        const alternativeFormats = [
          hrisEmployee.supervisor_id.toLowerCase(),
          hrisEmployee.supervisor_id.toUpperCase(),
          hrisEmployee.supervisor_id.replace(/^MT/, 'mt'),
          hrisEmployee.supervisor_id.replace(/^mt/, 'MT'),
          hrisEmployee.supervisor_id.padStart(8, '0'), // Add leading zeros
          hrisEmployee.supervisor_id.replace(/^0+/, '') // Remove leading zeros
        ];

        for (const altFormat of alternativeFormats) {
          if (altFormat !== hrisEmployee.supervisor_id) {
            try {
              const altFilter = `(&(objectClass=user)(employeeID=${altFormat}))`;
              const altResults = await ldapSearch(ad.baseDN, altFilter, [
                'distinguishedName', 'displayName', 'employeeID'
              ]);

              if (altResults.length > 0) {
                console.log(`✅ Found supervisor with alternative format "${altFormat}":`);
                console.log(`     DN: ${altResults[0].distinguishedName}`);
                console.log(`     Display Name: ${altResults[0].displayName}`);
              }
            } catch (error) {
              // Ignore errors for alternative format searches
            }
          }
        }
      } else {
        console.log(`\n⚠️  No supervisor ID in HRIS for this employee`);
      }

      console.log(`\n${'='.repeat(50)}`);
    }

    console.log(`\n✅ Debug completed for ${employeeIds.length} employee(s)`);

  } catch (error) {
    console.error('❌ Debug script error:', error);
    process.exit(1);
  }
}

// Run the debug script
debugSupervisorLookup()
  .then(() => {
    console.log('\n🎉 Debug script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  });