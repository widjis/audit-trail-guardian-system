
-- First create the new MS365 license types table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ms365_license_types' AND xtype='U')
BEGIN
    CREATE TABLE ms365_license_types (
        id NVARCHAR(255) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL UNIQUE,
        description NVARCHAR(MAX)
    );

    -- Insert default license types
    INSERT INTO ms365_license_types (id, name, description)
    VALUES 
        ('1', 'None', 'No Microsoft 365 license'),
        ('2', 'E1', 'Microsoft 365 E1 - Basic email, web versions of Office apps'),
        ('3', 'E3', 'Microsoft 365 E3 - Standard suite with desktop apps'),
        ('4', 'E5', 'Microsoft 365 E5 - Premium suite with advanced security'),
        ('5', 'Business Basic', 'Microsoft 365 Business Basic - Email and web apps'),
        ('6', 'Business Standard', 'Microsoft 365 Business Standard - Email and desktop apps'),
        ('7', 'Business Premium', 'Microsoft 365 Business Premium - Business Standard with security');
    
    PRINT 'MS365 license types table created successfully';
END
ELSE
BEGIN
    PRINT 'MS365 license types table already exists';
END

-- Now alter the hires table to change the microsoft_365_license column from BIT to NVARCHAR
IF EXISTS (SELECT * FROM sysobjects WHERE name='hires' AND xtype='U')
BEGIN
    -- Check if the column is BIT type
    IF EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'hires' 
        AND COLUMN_NAME = 'microsoft_365_license' 
        AND DATA_TYPE = 'bit'
    )
    BEGIN
        -- First update existing data to convert boolean to string value
        UPDATE hires SET microsoft_365_license = 
            CASE 
                WHEN microsoft_365_license = 1 THEN 'Business Standard' 
                ELSE 'None' 
            END;
        
        -- Then alter the column to NVARCHAR
        ALTER TABLE hires ALTER COLUMN microsoft_365_license NVARCHAR(100);
        
        PRINT 'Successfully altered microsoft_365_license column from BIT to NVARCHAR';
    END
    ELSE
    BEGIN
        PRINT 'microsoft_365_license column is already NVARCHAR or does not exist';
    END
END
ELSE
BEGIN
    PRINT 'Hires table does not exist';
END
