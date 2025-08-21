import sql from 'mssql';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Check MTIUsers table structure and data
 */
async function checkMTIUsers() {
    console.log('🚀 Checking MTIUsers table structure and data...');
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
        }
    };
    
    let pool;
    
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database');
        console.log('');
        
        // Check if MTIUsers table exists
        const tableCheck = await pool.request().query(`
            SELECT COUNT(*) as exists_count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'MTIUsers'
        `);
        
        if (tableCheck.recordset[0].exists_count === 0) {
            console.log('❌ MTIUsers table does not exist');
            return;
        }
        
        console.log('✅ MTIUsers table exists');
        console.log('');
        
        // Get detailed column information
        console.log('📋 MTIUsers Table Structure:');
        const columnsResult = await pool.request().query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                CHARACTER_MAXIMUM_LENGTH,
                NUMERIC_PRECISION,
                NUMERIC_SCALE,
                COLUMN_DEFAULT,
                ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'MTIUsers'
            ORDER BY ORDINAL_POSITION
        `);
        
        columnsResult.recordset.forEach((col, index) => {
            const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
            let dataType = col.DATA_TYPE;
            
            if (col.CHARACTER_MAXIMUM_LENGTH) {
                dataType += `(${col.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : col.CHARACTER_MAXIMUM_LENGTH})`;
            } else if (col.NUMERIC_PRECISION) {
                dataType += `(${col.NUMERIC_PRECISION}${col.NUMERIC_SCALE ? ',' + col.NUMERIC_SCALE : ''})`;
            }
            
            const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
            console.log(`   ${index + 1}. ${col.COLUMN_NAME}: ${dataType} ${nullable}${defaultVal}`);
        });
        
        console.log('');
        
        // Get row count
        const countResult = await pool.request().query('SELECT COUNT(*) as total_rows FROM MTIUsers');
        console.log(`📊 Total rows in MTIUsers: ${countResult.recordset[0].total_rows}`);
        console.log('');
        
        // Get sample data (first 5 rows)
        if (countResult.recordset[0].total_rows > 0) {
            console.log('📄 Sample data (first 5 rows):');
            const sampleResult = await pool.request().query('SELECT TOP 5 * FROM MTIUsers');
            
            if (sampleResult.recordset.length > 0) {
                // Display column headers
                const columns = Object.keys(sampleResult.recordset[0]);
                console.log('   ' + columns.join(' | '));
                console.log('   ' + columns.map(col => '-'.repeat(col.length)).join('-|-'));
                
                // Display sample rows
                sampleResult.recordset.forEach((row, index) => {
                    const values = columns.map(col => {
                        let val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'string' && val.length > 20) {
                            return val.substring(0, 17) + '...';
                        }
                        return String(val);
                    });
                    console.log(`   ${values.join(' | ')}`);
                });
            }
        } else {
            console.log('📄 MTIUsers table is empty');
        }
        
        console.log('');
        
        // Check for indexes
        console.log('🔍 Indexes on MTIUsers table:');
        const indexResult = await pool.request().query(`
            SELECT 
                i.name AS index_name,
                i.type_desc AS index_type,
                i.is_unique,
                i.is_primary_key,
                STRING_AGG(c.name, ', ') AS columns
            FROM sys.indexes i
            INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            WHERE t.name = 'MTIUsers'
            GROUP BY i.name, i.type_desc, i.is_unique, i.is_primary_key
            ORDER BY i.is_primary_key DESC, i.is_unique DESC
        `);
        
        if (indexResult.recordset.length > 0) {
            indexResult.recordset.forEach(idx => {
                const type = idx.is_primary_key ? 'PRIMARY KEY' : 
                           idx.is_unique ? 'UNIQUE' : 'INDEX';
                console.log(`   ${type}: ${idx.index_name} (${idx.columns})`);
            });
        } else {
            console.log('   No indexes found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
    
    console.log('\n✅ MTIUsers table check completed.');
}

// Run the check
checkMTIUsers().catch(console.error);