# Database Management Scripts

This directory contains Node.js scripts for managing the database schema and tables.

## Available Scripts

### 1. Schema Update Script (`update-schema.js`)
Reads and executes the complete `dbSchema.sql` file against the database.

### 2. Schema Verification Script (`verify-schema.js`)
Verifies that all expected tables exist and checks the structure of critical tables.

### 3. User Preferences Table Script (`create-user-preferences.js`)
Specifically creates the `user_preferences` table with proper structure and constraints.

## Overview
The `update-schema.js` script allows you to execute the database schema directly against your database. This is useful for:

- Initial database setup
- Applying schema changes in development
- Database migrations
- Setting up new environments

### Prerequisites

1. **Environment Configuration**: Ensure your `.env` file is properly configured with database connection details:
   ```env
   DB_TYPE=mssql
   DB_HOST=your_database_host
   DB_PORT=1433
   DB_NAME=your_database_name
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_ENCRYPT=false
   ```

2. **Database Access**: Ensure the database user has sufficient privileges to:
   - Create tables
   - Create indexes
   - Create foreign key constraints
   - Alter table structures

### Usage

#### Method 1: Using npm script (Recommended)
```bash
npm run db:update-schema
```

#### Method 2: Direct execution
```bash
node scripts/update-schema.js
```

### What the Script Does

1. **Environment Loading**: Loads database configuration from `.env` file
2. **Connection Initialization**: Establishes connection to the database using the same logic as the main application
3. **Schema Reading**: Reads the SQL schema from `src/server/data/dbSchema.sql`
4. **Statement Parsing**: Splits the schema into individual SQL statements
5. **Sequential Execution**: Executes each statement in order with error handling
6. **Progress Reporting**: Provides detailed feedback on execution progress
7. **Summary Report**: Shows final statistics of successful and failed operations

### Features

- ✅ **Multi-Database Support**: Works with both MSSQL and PostgreSQL
- ✅ **Error Handling**: Continues execution even if some statements fail
- ✅ **Progress Tracking**: Real-time feedback on execution progress
- ✅ **Safe Execution**: Uses `IF NOT EXISTS` checks to prevent duplicate table creation
- ✅ **Detailed Logging**: Comprehensive error reporting with SQL error codes
- ✅ **Connection Management**: Proper connection cleanup on completion

### Output Example

```
🚀 Starting Database Schema Update Script
==========================================

✅ Environment variables loaded from .env
🔌 Initializing database connection...
📊 Using database type: mssql
🔧 Connection config: {...}
✅ MSSQL connection pool successfully initialized
📄 Reading schema file: /path/to/dbSchema.sql
📝 Found 8 SQL statements to execute

🔄 Executing statement 1/8...
📋 SQL: IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')...
✅ Statement executed successfully

🔄 Executing statement 2/8...
📋 SQL: IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U')...
✅ Statement executed successfully

...

📊 Schema Update Summary:
   ✅ Successful statements: 8
   ❌ Failed statements: 0
   📈 Total statements: 8

🎉 Schema update completed successfully!
🔌 Database connection closed
🏁 Script completed successfully!
```

### Error Handling

The script includes robust error handling:

- **Non-Critical Errors**: Continues execution for most errors (e.g., constraint already exists)
- **Critical Errors**: Stops execution for database connectivity issues
- **Detailed Error Reporting**: Shows SQL error numbers, codes, and line numbers for MSSQL
- **Graceful Cleanup**: Always closes database connections, even on failure

### Troubleshooting

#### Common Issues

1. **Connection Failed**
   - Verify database server is running
   - Check network connectivity
   - Validate credentials in `.env` file
   - Ensure database exists

2. **Permission Denied**
   - Verify database user has CREATE TABLE privileges
   - Check if user can create foreign key constraints
   - Ensure user has ALTER TABLE permissions

3. **Schema File Not Found**
   - Verify the script is run from the project root
   - Check that `src/server/data/dbSchema.sql` exists

4. **Constraint Errors**
   - Review existing database schema
   - Check for naming conflicts
   - Verify foreign key references exist

#### Debug Mode

For additional debugging information, you can modify the script to include more verbose logging or run individual SQL statements manually.

### Integration with CI/CD

This script can be integrated into your deployment pipeline:

```yaml
# Example GitHub Actions step
- name: Update Database Schema
  run: npm run db:update-schema
  env:
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_USER: ${{ secrets.DB_USER }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    DB_NAME: ${{ secrets.DB_NAME }}
```

### Security Considerations

- Never commit database credentials to version control
- Use environment variables or secure secret management
- Ensure database connections use appropriate encryption
- Limit database user privileges to minimum required permissions
- Review schema changes before applying to production databases

### Contributing

When modifying the schema update script:

1. Test with both MSSQL and PostgreSQL if applicable
2. Ensure proper error handling for new database operations
3. Update this documentation for any new features
4. Test with various error scenarios
5. Verify connection cleanup works correctly