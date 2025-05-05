
-- MS SQL Server Users Schema

-- Check if the users table already exists
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id NVARCHAR(255) PRIMARY KEY,
        username NVARCHAR(255) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL
    );
    
    -- Create an index on username for faster lookups
    CREATE INDEX IDX_USERS_USERNAME ON users(username);
    
    -- Insert default admin account if none exists
    INSERT INTO users (id, username, password, role)
    VALUES ('1', 'admin', 'password123', 'admin');
    
    PRINT 'Users table created successfully';
END
ELSE
BEGIN
    PRINT 'Users table already exists';
END
