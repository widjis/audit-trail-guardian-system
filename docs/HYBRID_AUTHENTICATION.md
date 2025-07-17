# Hybrid Authentication System

This document describes the hybrid authentication system that allows users to authenticate using both local database credentials and LDAP/Active Directory credentials.

## Overview

The hybrid authentication system provides flexible authentication options for the ICT Support system:

- **Local Authentication**: Users authenticate using credentials stored in the local database
- **LDAP Authentication**: Users authenticate using LDAP/Active Directory credentials
- **Hybrid Mode**: Users can choose their preferred authentication method, with automatic fallback options

## Features

### 1. Multiple Authentication Modes

- **Local Only**: All users must use local database credentials
- **LDAP Only**: All users must use LDAP/Active Directory credentials
- **Hybrid**: Users can choose between local and LDAP authentication

### 2. Admin Configuration

Administrators can configure the authentication mode through the Settings panel:

- Navigate to Settings → Authentication
- Select the desired authentication mode
- Configure LDAP fallback options for hybrid mode
- Changes take effect immediately for new logins

### 3. User Experience

#### Login Process

1. **Local/LDAP Only Modes**: Users see a standard login form
2. **Hybrid Mode**: Users can select their preferred authentication method:
   - Auto-detect (recommended)
   - Local Account
   - Active Directory

#### Authentication Method Selection

In hybrid mode, users can choose:
- **Auto-detect**: System automatically determines the best authentication method
- **Local Account**: Force authentication using local database
- **Active Directory**: Force authentication using LDAP/AD

### 4. Automatic User Creation

When LDAP users authenticate successfully:
- A local user record is automatically created
- User information is populated from LDAP attributes
- The user is marked as LDAP-authenticated
- Admin approval may be required based on system settings

## Technical Implementation

### Database Schema Changes

#### Users Table
```sql
ALTER TABLE users ADD COLUMN authentication_type VARCHAR(10) DEFAULT 'local';
ALTER TABLE users ADD COLUMN approved BOOLEAN DEFAULT 0;
```

#### System Configurations
```sql
INSERT INTO system_configurations (config_key, config_name, config_value) VALUES
('auth_mode', 'Authentication Mode', 'local'),
('ldap_fallback_enabled', 'LDAP Fallback Enabled', 'false');
```

### Backend Components

#### 1. Hybrid Authentication Service (`hybrid-auth.js`)
- `authenticateHybrid()`: Main authentication function
- `authenticateLocal()`: Local database authentication
- `authenticateLdap()`: LDAP/AD authentication
- `getAuthConfig()`: Get current authentication configuration
- `updateAuthConfig()`: Update authentication configuration

#### 2. Updated Authentication Routes (`auth.js`)
- Enhanced `/login` endpoint with authentication method support
- New `/auth/config` endpoints for configuration management
- Support for authentication method selection

#### 3. LDAP Integration
- Configurable LDAP server settings
- Support for various LDAP authentication formats
- Automatic user attribute mapping
- Connection pooling and error handling

### Frontend Components

#### 1. Enhanced Login Form (`LoginForm.tsx`)
- Dynamic authentication method selection
- Context-aware form fields and help text
- Real-time configuration loading
- Responsive design for mobile and desktop

#### 2. Authentication Settings (`AuthenticationSettings.tsx`)
- Admin configuration interface
- Real-time preview of current settings
- Security notes and best practices
- Material UI design system

#### 3. Updated Auth Service (`auth-service.ts`)
- Support for authentication method parameter
- Configuration management functions
- Enhanced error handling

## Configuration

### LDAP Settings

Configure LDAP settings in the Active Directory section:

```javascript
{
  server: "ldap://your-domain-controller.com",
  port: 389, // or 636 for LDAPS
  baseDN: "DC=yourdomain,DC=com",
  userSearchBase: "OU=Users,DC=yourdomain,DC=com",
  usernameAttribute: "sAMAccountName",
  protocol: "ldap", // or "ldaps"
  authFormat: "upn" // or "dn"
}
```

### Authentication Modes

#### Local Mode
```javascript
{
  authMode: "local",
  ldapFallbackEnabled: false
}
```

#### LDAP Mode
```javascript
{
  authMode: "ldap",
  ldapFallbackEnabled: false
}
```

#### Hybrid Mode
```javascript
{
  authMode: "hybrid",
  ldapFallbackEnabled: true // optional
}
```

## Security Considerations

### 1. Password Security
- Local passwords are hashed using bcrypt
- LDAP passwords are never stored locally
- Session tokens have configurable expiration

### 2. User Approval
- LDAP users can require admin approval
- Existing local users maintain their approval status
- Admin users can always authenticate locally

### 3. Fallback Security
- Fallback only works for existing users
- Failed LDAP authentication doesn't expose local credentials
- Audit logging for all authentication attempts

### 4. Configuration Security
- Authentication configuration requires admin privileges
- Sensitive LDAP credentials are encrypted in database
- Configuration changes are logged

## Testing

### Running Tests

Execute the test script to verify hybrid authentication functionality:

```bash
node scripts/test-hybrid-auth.js
```

### Test Coverage

The test script covers:
- Authentication configuration management
- Local authentication with valid/invalid credentials
- LDAP authentication (simulated)
- Hybrid mode auto-detection
- Fallback mechanism functionality
- Different authentication mode behaviors

### Manual Testing

1. **Test Local Authentication**:
   - Set mode to "Local Only"
   - Login with local credentials
   - Verify LDAP credentials are rejected

2. **Test LDAP Authentication**:
   - Set mode to "LDAP Only"
   - Login with LDAP credentials
   - Verify local credentials are rejected

3. **Test Hybrid Mode**:
   - Set mode to "Hybrid"
   - Test authentication method selection
   - Verify auto-detection works
   - Test fallback mechanism

## Migration Guide

### From Local-Only System

1. Run the migration script:
   ```bash
   node scripts/migrate-hybrid-auth.js
   ```

2. Configure LDAP settings in Active Directory section

3. Set authentication mode to "Hybrid" in Authentication settings

4. Test with a few LDAP users before full deployment

### Rollback Procedure

1. Set authentication mode back to "Local Only"
2. Existing local users continue to work normally
3. LDAP-created users will need local passwords assigned

## Troubleshooting

### Common Issues

#### 1. LDAP Connection Failures
- Verify LDAP server settings
- Check network connectivity
- Validate credentials and permissions
- Review LDAP server logs

#### 2. Authentication Method Not Showing
- Verify authentication mode is set to "Hybrid"
- Check browser cache and refresh
- Verify frontend configuration loading

#### 3. User Creation Failures
- Check database permissions
- Verify user table schema
- Review application logs
- Validate LDAP attribute mapping

### Debug Logging

Enable debug logging for authentication:

```javascript
// In your environment configuration
DEBUG_AUTH=true
```

### Log Locations

- Authentication attempts: Application logs
- LDAP connections: LDAP service logs
- Configuration changes: Admin audit logs
- Database operations: Database logs

## API Reference

### Authentication Endpoints

#### POST /auth/login
```javascript
{
  username: "string",
  password: "string",
  authMethod: "local|ldap|auto" // optional
}
```

#### GET /auth/config
Returns current authentication configuration.

#### POST /auth/config
```javascript
{
  authMode: "local|ldap|hybrid",
  ldapFallbackEnabled: boolean
}
```

### Response Format

#### Successful Authentication
```javascript
{
  token: "string",
  user: {
    id: "string",
    username: "string",
    role: "string",
    authenticationType: "local|ldap",
    adInfo?: {
      displayName: "string",
      email: "string",
      department: "string"
    }
  }
}
```

## Best Practices

### 1. Deployment
- Test in development environment first
- Migrate during low-usage periods
- Have rollback plan ready
- Monitor authentication logs

### 2. Security
- Use LDAPS when possible
- Regularly rotate service account passwords
- Monitor failed authentication attempts
- Keep LDAP server updated

### 3. User Management
- Provide clear documentation for users
- Train support staff on hybrid authentication
- Set up monitoring and alerting
- Regular security audits

### 4. Performance
- Configure LDAP connection pooling
- Monitor authentication response times
- Cache LDAP queries when appropriate
- Optimize database queries

## Support

For issues or questions regarding the hybrid authentication system:

1. Check the troubleshooting section above
2. Review application logs for error details
3. Test with the provided test script
4. Contact the development team with specific error messages and steps to reproduce

## Changelog

### Version 1.0.0
- Initial implementation of hybrid authentication
- Support for local, LDAP, and hybrid modes
- Admin configuration interface
- Automatic user creation for LDAP users
- Comprehensive test suite
- Documentation and migration guides