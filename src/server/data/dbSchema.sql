
-- MS SQL Server Users Schema

-- Check if the users table already exists
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id NVARCHAR(255) PRIMARY KEY,
        username NVARCHAR(255) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        approved BIT DEFAULT 0
    );
    
    -- Create an index on username for faster lookups
    CREATE INDEX IDX_USERS_USERNAME ON users(username);
    
    -- Insert default admin account if none exists
    INSERT INTO users (id, username, password, role, approved)
    VALUES ('1', 'admin', 'password123', 'admin', 1);
    
    PRINT 'Users table created successfully';
END
ELSE
BEGIN
    -- Check if admin user exists, if not create it
    IF NOT EXISTS (SELECT * FROM users WHERE id = '1' AND role = 'admin')
    BEGIN
        INSERT INTO users (id, username, password, role, approved)
        VALUES ('1', 'admin', 'password123', 'admin', 1);
        PRINT 'Admin user created successfully';
    END
    ELSE
    BEGIN
        PRINT 'Admin user already exists';
    END
    
    -- Check if the 'approved' column exists, if not add it
    IF NOT EXISTS (SELECT * FROM syscolumns WHERE id=OBJECT_ID('users') AND name='approved')
    BEGIN
        ALTER TABLE users ADD approved BIT DEFAULT 0;
        -- Set existing users (except new registrations) as approved
        UPDATE users SET approved = 1 WHERE role IN ('admin', 'support');
        PRINT 'Added approved column to users table';
    END
    
    PRINT 'Users table already exists';
END

-- Check if the departments table already exists
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U')
BEGIN
    CREATE TABLE departments (
        id NVARCHAR(255) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL UNIQUE,
        code NVARCHAR(50) NOT NULL UNIQUE
    );

    -- Insert default departments
    INSERT INTO departments (id, name, code)
    VALUES 
        ('1', 'Engineering', 'ENG'),
        ('2', 'Human Resources', 'HR'),
        ('3', 'Finance', 'FIN'),
        ('4', 'Marketing', 'MKT'),
        ('5', 'Sales', 'SLS');
    
    PRINT 'Departments table created successfully';
END
ELSE
BEGIN
    PRINT 'Departments table already exists';
END

-- Check if the hires table already exists
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='hires' AND xtype='U')
BEGIN
    CREATE TABLE hires (
        id NVARCHAR(255) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        department NVARCHAR(255) NOT NULL,
        email NVARCHAR(255),
        direct_report NVARCHAR(255),
        phone_number NVARCHAR(100),
        mailing_list NVARCHAR(255),
        remarks NVARCHAR(MAX),
        account_creation_status NVARCHAR(50) DEFAULT 'Pending',
        license_assigned BIT DEFAULT 0,
        status_srf BIT DEFAULT 0,
        username NVARCHAR(255),
        password NVARCHAR(255),
        on_site_date DATE,
        microsoft_365_license BIT DEFAULT 0,
        laptop_ready NVARCHAR(50) DEFAULT 'Pending',
        note NVARCHAR(MAX),
        ict_support_pic NVARCHAR(255),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'Hires table created successfully';
END
ELSE
BEGIN
    PRINT 'Hires table already exists';
END

-- Check if the audit_logs table already exists
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_logs' AND xtype='U')
BEGIN
    CREATE TABLE audit_logs (
        id NVARCHAR(255) PRIMARY KEY,
        new_hire_id NVARCHAR(255) NOT NULL,
        action_type NVARCHAR(100) NOT NULL,
        status NVARCHAR(50) NOT NULL,
        message NVARCHAR(MAX),
        details NVARCHAR(MAX),
        performed_by NVARCHAR(255),
        timestamp DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (new_hire_id) REFERENCES hires(id) ON DELETE CASCADE
    );
    
    PRINT 'Audit logs table created successfully';
END
ELSE
BEGIN
    PRINT 'Audit logs table already exists';
END
