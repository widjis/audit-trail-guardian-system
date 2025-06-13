
-- Create the users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT GETDATE()
);

-- Create the hires table
CREATE TABLE hires (
  id VARCHAR(255) PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255),
  department VARCHAR(255),
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  account_creation_status VARCHAR(50) DEFAULT 'Pending',
  account_creation_date DATETIME,
  account_created_by VARCHAR(255),
  position_grade VARCHAR(255),
  personal_email VARCHAR(255),
  phone_number VARCHAR(20),
  mailing_lists TEXT,
  office_location VARCHAR(255),
  employee_id VARCHAR(255),
  country VARCHAR(255),
  city VARCHAR(255),
  address VARCHAR(255),
  postal_code VARCHAR(20),
  hris_id VARCHAR(255),
  microsoft_365_license VARCHAR(255)
);

-- Create the audit_logs table
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  hire_id VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  performed_by VARCHAR(255),
  created_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (hire_id) REFERENCES hires(id)
);

-- Create the departments table
CREATE TABLE departments (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50)
);

-- Create the ms365_license_types table
CREATE TABLE ms365_license_types (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT
);

-- Add distribution list sync columns to hires table
ALTER TABLE hires ADD distribution_list_sync_status VARCHAR(50) DEFAULT NULL;
ALTER TABLE hires ADD distribution_list_sync_date DATETIME DEFAULT NULL;
