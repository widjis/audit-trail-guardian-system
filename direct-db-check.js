import sql from 'mssql';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Direct database connection test and structure check
 */
async function checkDatabase() {
    console.log('🚀 Starting direct database connection test...');
    console.log('============================================================');
    
    const config = {
        server: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 1433,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: true,
            enableArithAbort: true
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };
    
    console.log('📋 Database Configuration:');
    console.log(`   Server: ${config.server}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    console.log(`   Encrypt: ${config.options.encrypt}`);
    console.log('');
    
    let pool;
    
    try {
        console.log('🔌 Attempting to connect to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connection successful!');
        console.log('');
        
        // List all tables
        console.log('📊 Listing all tables in database...');
        const tablesResult = await pool.request().query(`
            SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
        `);
        
        console.log(`Found ${tablesResult.recordset.length} tables:`);
        tablesResult.recordset.forEach(table => {
            console.log(`   ${table.TABLE_SCHEMA}.${table.TABLE_NAME}`);
        });
        console.log('');
        
        // Check for specific tables we expect
        const expectedTables = ['users', 'hires', 'departments', 'audit_logs', 'ms365_license_types'];
        console.log('🔍 Checking for expected tables...');
        
        for (const tableName of expectedTables) {
            const tableExists = tablesResult.recordset.some(t => 
                t.TABLE_NAME.toLowerCase() === tableName.toLowerCase()
            );
            
            if (tableExists) {
                console.log(`   ✅ ${tableName} - EXISTS`);
                
                // Get column information
                const columnsResult = await pool.request()
                    .input('tableName', sql.NVarChar, tableName)
                    .query(`
                        SELECT 
                            COLUMN_NAME,
                            DATA_TYPE,
                            IS_NULLABLE,
                            CHARACTER_MAXIMUM_LENGTH,
                            COLUMN_DEFAULT
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = @tableName
                        ORDER BY ORDINAL_POSITION
                    `);
                
                console.log(`      Columns (${columnsResult.recordset.length}):`);
                columnsResult.recordset.forEach(col => {
                    const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
                    const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                    console.log(`         ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}`);
                });
                
                // Get row count
                try {
                    const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM [${tableName}]`);
                    console.log(`      Row count: ${countResult.recordset[0].count}`);
                } catch (err) {
                    console.log(`      Row count: Error - ${err.message}`);
                }
                console.log('');
            } else {
                console.log(`   ❌ ${tableName} - NOT FOUND`);
            }
        }
        
        // Check for MTI-related tables
        console.log('🔍 Searching for MTI/HRIS/Employee related tables...');
        const mtiTables = tablesResult.recordset.filter(t => 
            t.TABLE_NAME.toLowerCase().includes('mti') ||
            t.TABLE_NAME.toLowerCase().includes('hris') ||
            t.TABLE_NAME.toLowerCase().includes('employee') ||
            t.TABLE_NAME.toLowerCase().includes('user')
        );
        
        if (mtiTables.length > 0) {
            console.log('Found MTI/HRIS/Employee/User related tables:');
            mtiTables.forEach(table => {
                console.log(`   ${table.TABLE_SCHEMA}.${table.TABLE_NAME}`);
            });
        } else {
            console.log('No MTI/HRIS/Employee/User related tables found.');
        }
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        
        if (error.code === 'ELOGIN') {
            console.error('   → Check username and password');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   → Check server address and port');
        } else if (error.code === 'ETIMEOUT') {
            console.error('   → Check network connectivity');
        }
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Database connection closed.');
        }
    }
    
    console.log('\n✅ Database check completed.');
}

// Run the check
checkDatabase().catch(console.error);