
# MTI Onboarding Workflow API Documentation

This document provides comprehensive documentation for all API endpoints available in the MTI Onboarding Workflow system.

## Base URL

All API endpoints are relative to the base URL of your deployment:

- Development: `http://localhost:3001/api`
- Production: `http://{your-domain}/api`

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [New Hires Management](#new-hires-management)
3. [Audit Logs](#audit-logs)
4. [Settings Management](#settings-management)
5. [Database Configuration](#database-configuration)
6. [Active Directory](#active-directory)
7. [Users Management](#users-management)
8. [WhatsApp Integration](#whatsapp-integration)
9. [Error Handling](#error-handling)

## Authentication Endpoints

### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Description**: Authenticates a user and returns a JWT token
- **Request Body**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **Response**:
  ```json
  {
    "token": "jwt_token_string",
    "user": {
      "id": "user_id",
      "username": "username",
      "role": "admin_or_support"
    }
  }
  ```
- **Error Response**: 
  - 401 Unauthorized - Invalid credentials
  - 403 Forbidden - Account pending approval

### Register
- **URL**: `/auth/register`
- **Method**: `POST`
- **Description**: Registers a new support user (requires admin approval before login)
- **Request Body**:
  ```json
  {
    "username": "new_username",
    "password": "secure_password"
  }
  ```
- **Response**: Same as login
- **Notes**: New registrations are assigned the "support" role and require admin approval

### Verify Token
- **URL**: `/auth/verify-token`
- **Method**: `POST`
- **Description**: Verifies if a token is valid
- **Request Body**:
  ```json
  {
    "token": "jwt_token_string"
  }
  ```
- **Response**:
  ```json
  {
    "valid": true
  }
  ```

## New Hires Management

### Get All Hires
- **URL**: `/hires`
- **Method**: `GET`
- **Description**: Retrieves a list of all new hires
- **Query Parameters**:
  - `status` (optional): Filter by status
  - `department` (optional): Filter by department
  - `search` (optional): Search by name or email
  - `page` (optional): Page number for pagination
  - `limit` (optional): Items per page
- **Response**:
  ```json
  {
    "data": [
      {
        "id": "hire_id",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone_number": "+1234567890",
        "title": "Software Engineer",
        "department": "Engineering",
        "status": "Active",
        "created_at": "2023-05-01T12:00:00Z",
        "updated_at": "2023-05-01T12:00:00Z"
      }
    ],
    "totalItems": 50,
    "currentPage": 1,
    "totalPages": 5
  }
  ```

### Get Single Hire
- **URL**: `/hires/:id`
- **Method**: `GET`
- **Description**: Retrieves details of a specific hire
- **URL Parameters**:
  - `id`: ID of the hire
- **Response**: Single hire object with all details
- **Error Response**: 
  - 404 Not Found - Hire not found

### Create Hire
- **URL**: `/hires`
- **Method**: `POST`
- **Description**: Creates a new hire
- **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone_number": "+1234567890",
    "title": "Product Manager",
    "department": "Product",
    "status": "Pending",
    "mailing_list": ["General Updates"],
    "notes": "Starting next week",
    "remarks": "Experienced hire",
    "microsoft_365_license": "Microsoft 365 Business Standard"
  }
  ```
- **Response**: Created hire object with ID
- **Error Response**: 
  - 400 Bad Request - Validation errors

### Update Hire
- **URL**: `/hires/:id`
- **Method**: `PUT`
- **Description**: Updates an existing hire
- **URL Parameters**:
  - `id`: ID of the hire
- **Request Body**: Same fields as create hire (all fields optional)
- **Response**: Updated hire object
- **Error Response**: 
  - 404 Not Found - Hire not found

### Delete Hire
- **URL**: `/hires/:id`
- **Method**: `DELETE`
- **Description**: Deletes a hire
- **URL Parameters**:
  - `id`: ID of the hire
- **Response**:
  ```json
  {
    "success": true
  }
  ```
- **Error Response**: 
  - 404 Not Found - Hire not found

### Import Hires
- **URL**: `/hires/import`
- **Method**: `POST`
- **Description**: Imports multiple hires from a CSV file
- **Request Body**: FormData with CSV file (key: 'file')
- **Response**:
  ```json
  {
    "success": true,
    "imported": 5,
    "failed": 1,
    "errors": [
      {
        "row": 3,
        "error": "Email is required"
      }
    ]
  }
  ```

### Get CSV Template
- **URL**: `/hires/template`
- **Method**: `GET`
- **Description**: Downloads a CSV template for importing hires
- **Response**: CSV file download

### Bulk Delete
- **URL**: `/hires/bulk-delete`
- **Method**: `POST`
- **Description**: Deletes multiple hires
- **Request Body**:
  ```json
  {
    "ids": ["id1", "id2", "id3"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "deleted": 3
  }
  ```

### Bulk Update
- **URL**: `/hires/bulk-update`
- **Method**: `POST`
- **Description**: Updates multiple hires with the same values
- **Request Body**:
  ```json
  {
    "ids": ["id1", "id2", "id3"],
    "updateData": {
      "status": "Active",
      "department": "Engineering"
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "updated": 3
  }
  ```

## Audit Logs

### Get Logs for Hire
- **URL**: `/hires/:id/logs`
- **Method**: `GET`
- **Description**: Retrieves all audit logs for a specific hire
- **URL Parameters**:
  - `id`: ID of the hire
- **Response**:
  ```json
  [
    {
      "id": "log_id",
      "new_hire_id": "hire_id",
      "action": "status_change",
      "details": "Status changed from Pending to Active",
      "user_id": "user_id",
      "username": "admin",
      "timestamp": "2023-05-02T14:30:00Z"
    }
  ]
  ```

### Create Log
- **URL**: `/hires/:id/logs`
- **Method**: `POST`
- **Description**: Creates a new audit log entry for a hire
- **URL Parameters**:
  - `id`: ID of the hire
- **Request Body**:
  ```json
  {
    "action": "note_added",
    "details": "Added onboarding notes"
  }
  ```
- **Response**: Created log object

## Settings Management

### Get All Settings
- **URL**: `/settings`
- **Method**: `GET`
- **Description**: Retrieves all system settings
- **Response**:
  ```json
  {
    "accountStatuses": ["Pending", "Active", "Inactive", "Suspended"],
    "mailingLists": [
      {"id": "1", "name": "General Updates", "isDefault": true},
      {"id": "2", "name": "Technical Team", "isDefault": false}
    ],
    "departments": [
      {"id": "1", "name": "Engineering", "code": "ENG"},
      {"id": "2", "name": "Human Resources", "code": "HR"}
    ],
    "mailingListDisplayAsDropdown": true,
    "whatsappSettings": {
      "apiUrl": "http://api.example.com",
      "defaultMessage": "Welcome message template",
      "defaultRecipient": "userNumber"
    }
  }
  ```

### Update Account Statuses
- **URL**: `/settings/account-statuses`
- **Method**: `PUT`
- **Description**: Updates the list of available account statuses
- **Request Body**:
  ```json
  {
    "statuses": ["Pending", "Active", "Inactive", "On Leave", "Terminated"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Account statuses updated successfully"
  }
  ```

### Update Mailing Lists
- **URL**: `/settings/mailing-lists`
- **Method**: `PUT`
- **Description**: Updates the mailing lists and display settings
- **Request Body**:
  ```json
  {
    "mailingLists": [
      {"id": "1", "name": "General Updates", "isDefault": true},
      {"id": "2", "name": "Technical Team", "isDefault": false},
      {"id": "3", "name": "New Hires", "isDefault": false}
    ],
    "displayAsDropdown": false
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Mailing lists updated successfully"
  }
  ```

### Update Departments
- **URL**: `/settings/departments`
- **Method**: `PUT`
- **Description**: Updates the list of departments
- **Request Body**:
  ```json
  {
    "departments": [
      {"id": "1", "name": "Engineering", "code": "ENG"},
      {"id": "2", "name": "Human Resources", "code": "HR"},
      {"id": "3", "name": "Marketing", "code": "MKT"}
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Departments updated successfully"
  }
  ```

### License Types Management

#### Get License Types
- **URL**: `/settings/license-types`
- **Method**: `GET`
- **Description**: Retrieves all Microsoft 365 license types
- **Response**:
  ```json
  [
    {
      "id": "1",
      "name": "Microsoft 365 Business Standard",
      "description": "Full Office apps and services"
    },
    {
      "id": "2",
      "name": "Microsoft 365 Business Basic",
      "description": "Web versions of Office apps"
    }
  ]
  ```

#### Add License Type
- **URL**: `/settings/license-types`
- **Method**: `POST`
- **Description**: Adds a new Microsoft 365 license type
- **Request Body**:
  ```json
  {
    "name": "Microsoft 365 Enterprise E3",
    "description": "Advanced security and compliance features"
  }
  ```
- **Response**: Created license type object

#### Update License Type
- **URL**: `/settings/license-types/:id`
- **Method**: `PUT`
- **Description**: Updates an existing license type
- **URL Parameters**:
  - `id`: ID of the license type
- **Request Body**:
  ```json
  {
    "name": "Microsoft 365 Enterprise E5",
    "description": "Premium security and analytics"
  }
  ```
- **Response**: Updated license type object

#### Delete License Type
- **URL**: `/settings/license-types/:id`
- **Method**: `DELETE`
- **Description**: Deletes a license type if it's not in use
- **URL Parameters**:
  - `id`: ID of the license type
- **Response**:
  ```json
  {
    "success": true
  }
  ```
- **Error Response**:
  - 400 Bad Request - License type is in use

### WhatsApp Settings

#### Get WhatsApp Settings
- **URL**: `/settings/whatsapp`
- **Method**: `GET`
- **Description**: Retrieves WhatsApp integration settings
- **Response**:
  ```json
  {
    "apiUrl": "http://10.60.10.46:8192",
    "defaultMessage": "Welcome message template with {{placeholders}}",
    "defaultRecipient": "userNumber"
  }
  ```

#### Update WhatsApp Settings
- **URL**: `/settings/whatsapp`
- **Method**: `PUT`
- **Description**: Updates WhatsApp integration settings
- **Request Body**:
  ```json
  {
    "apiUrl": "http://new.api.url:8192",
    "defaultMessage": "Updated welcome message with {{placeholders}}",
    "defaultRecipient": "testNumber"
  }
  ```
- **Response**: Updated WhatsApp settings object

## Database Configuration

### Get Database Configuration
- **URL**: `/settings/database-config`
- **Method**: `GET`
- **Description**: Retrieves current database connection configuration
- **Response**:
  ```json
  {
    "host": "localhost",
    "port": 1433,
    "user": "sa",
    "database": "onboarding",
    "connected": true
  }
  ```

### Update Database Configuration
- **URL**: `/settings/database-config`
- **Method**: `PUT`
- **Description**: Updates database connection settings
- **Request Body**:
  ```json
  {
    "host": "db.example.com",
    "port": 1433,
    "user": "admin",
    "password": "secure_password",
    "database": "mti_onboarding"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "connected": true,
    "message": "Database configuration updated successfully"
  }
  ```

### Test Database Connection
- **URL**: `/settings/database-config/test`
- **Method**: `POST`
- **Description**: Tests a database connection without saving
- **Request Body**: Same as Update Database Configuration
- **Response**:
  ```json
  {
    "success": true,
    "message": "Successfully connected to the database"
  }
  ```

## Active Directory

### Get Active Directory Configuration
- **URL**: `/settings/active-directory`
- **Method**: `GET`
- **Description**: Retrieves Active Directory configuration
- **Response**:
  ```json
  {
    "url": "ldap://ad.example.com",
    "baseDN": "DC=example,DC=com",
    "username": "admin@example.com",
    "connected": true
  }
  ```

### Update Active Directory Configuration
- **URL**: `/settings/active-directory`
- **Method**: `PUT`
- **Description**: Updates Active Directory configuration
- **Request Body**:
  ```json
  {
    "url": "ldap://ad.example.com",
    "baseDN": "DC=example,DC=com",
    "username": "admin@example.com",
    "password": "secure_password"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "connected": true,
    "message": "Active Directory configuration updated successfully"
  }
  ```

### Test Active Directory Connection
- **URL**: `/settings/active-directory/test`
- **Method**: `POST`
- **Description**: Tests Active Directory connection without saving
- **Request Body**: Same as Update Active Directory Configuration
- **Response**:
  ```json
  {
    "success": true,
    "message": "Successfully connected to Active Directory"
  }
  ```

### Search Active Directory Users
- **URL**: `/settings/active-directory/users`
- **Method**: `GET`
- **Description**: Searches for users in Active Directory
- **Query Parameters**:
  - `query` (required): Search query
  - `limit` (optional): Maximum number of results
- **Response**:
  ```json
  [
    {
      "distinguishedName": "CN=John Doe,OU=Users,DC=example,DC=com",
      "displayName": "John Doe",
      "sAMAccountName": "john.doe",
      "mail": "john.doe@example.com"
    }
  ]
  ```

### Create User in Active Directory
- **URL**: `/settings/active-directory/create-user`
- **Method**: `POST`
- **Description**: Creates a user in Active Directory
- **Request Body**:
  ```json
  {
    "firstName": "Jane",
    "lastName": "Smith",
    "username": "jane.smith",
    "password": "SecureP@ssw0rd",
    "email": "jane.smith@example.com",
    "title": "Software Engineer",
    "department": "Engineering",
    "ou": "OU=Users,DC=example,DC=com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "User created successfully in Active Directory",
    "distinguishedName": "CN=Jane Smith,OU=Users,DC=example,DC=com"
  }
  ```

## Users Management

### Get All Users
- **URL**: `/users`
- **Method**: `GET`
- **Description**: Retrieves all system users (admin only)
- **Response**:
  ```json
  [
    {
      "id": "1",
      "username": "admin",
      "role": "admin",
      "approved": true
    },
    {
      "id": "2",
      "username": "support_user",
      "role": "support",
      "approved": true
    }
  ]
  ```

### Get Support Accounts
- **URL**: `/users/support`
- **Method**: `GET`
- **Description**: Retrieves all support accounts (admin only)
- **Response**: Array of user objects with role "support"

### Get Pending Approval Accounts
- **URL**: `/users/pending`
- **Method**: `GET`
- **Description**: Retrieves accounts pending approval (admin only)
- **Response**: Array of user objects with approved=false

### Create User
- **URL**: `/users`
- **Method**: `POST`
- **Description**: Creates a new system user (admin only)
- **Request Body**:
  ```json
  {
    "username": "support_team1",
    "password": "secure_password",
    "role": "support"
  }
  ```
- **Response**: Created user object (without password)

### Update User
- **URL**: `/users/:id`
- **Method**: `PUT`
- **Description**: Updates an existing user (admin only)
- **URL Parameters**:
  - `id`: ID of the user
- **Request Body**:
  ```json
  {
    "username": "support_lead",
    "role": "support",
    "approved": true
  }
  ```
- **Response**: Updated user object (without password)

### Approve User
- **URL**: `/users/:id/approve`
- **Method**: `POST`
- **Description**: Approves a pending user account (admin only)
- **URL Parameters**:
  - `id`: ID of the user
- **Response**:
  ```json
  {
    "success": true,
    "message": "User username has been approved"
  }
  ```

### Disapprove User
- **URL**: `/users/:id/disapprove`
- **Method**: `POST`
- **Description**: Disapproves a user account (admin only)
- **URL Parameters**:
  - `id`: ID of the user
- **Response**:
  ```json
  {
    "success": true,
    "message": "User username has been disapproved"
  }
  ```

### Reset User Password
- **URL**: `/users/:id/reset-password`
- **Method**: `POST`
- **Description**: Resets a user's password (admin only)
- **URL Parameters**:
  - `id`: ID of the user
- **Request Body**:
  ```json
  {
    "password": "new_secure_password"
  }
  ```
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### Delete User
- **URL**: `/users/:id`
- **Method**: `DELETE`
- **Description**: Deletes a user (admin only)
- **URL Parameters**:
  - `id`: ID of the user
- **Response**:
  ```json
  {
    "success": true
  }
  ```
- **Error Response**:
  - 403 Forbidden - Cannot delete admin account

## WhatsApp Integration

### Send WhatsApp Message
- **URL**: `/whatsapp/send`
- **Method**: `POST`
- **Description**: Sends a WhatsApp message to a phone number
- **Request Body**:
  ```json
  {
    "number": "+1234567890",
    "message": "Your message content"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Message sent successfully"
  }
  ```
- **Error Response**:
  - 400 Bad Request - Missing required parameters
  - 400 Bad Request - WhatsApp API not configured
  - 500 Internal Server Error - Failed to send message

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters or payload
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

Error responses follow this format:
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

For validation errors, the response may include additional fields:
```json
{
  "error": "Validation error",
  "details": "Invalid input data",
  "validationErrors": {
    "field1": "Error message for field1",
    "field2": "Error message for field2"
  }
}
```
