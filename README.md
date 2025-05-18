
# MTI Onboarding Workflow

This is an application for managing new hire onboarding workflow.

## Getting Started

### Prerequisites
- Node.js (v14+)

### Installation

1. Install dependencies:
```
npm install
```

2. Start the frontend development server:
```
npm run dev
```

3. Start the backend server:
```
node src/server/start.js
```

The frontend will be available at http://localhost:5173
The backend API will be available at http://localhost:3001

## Features
- New hire management
- Audit logging
- Customizable settings for account statuses, mailing lists, and departments
- Active Directory integration
- WhatsApp messaging capabilities
- Database configuration

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username and password
- `POST /api/auth/register` - Register a new user (requires approval by admin)
- `POST /api/auth/verify-token` - Verify JWT token validity

### New Hires
- `GET /api/hires` - Get all hires
- `GET /api/hires/:id` - Get a specific hire by ID
- `POST /api/hires` - Create a new hire
- `PUT /api/hires/:id` - Update an existing hire
- `DELETE /api/hires/:id` - Delete a hire
- `POST /api/hires/import` - Import multiple hires via CSV
- `GET /api/hires/template` - Download CSV import template
- `POST /api/hires/bulk-delete` - Delete multiple hires
- `POST /api/hires/bulk-update` - Update multiple hires at once
- `GET /api/hires/:id/logs` - Get audit logs for a hire
- `POST /api/hires/:id/logs` - Create a log entry for a hire

### Settings
- `GET /api/settings` - Get all application settings
- `PUT /api/settings/account-statuses` - Update account status settings
- `PUT /api/settings/mailing-lists` - Update mailing list settings
- `PUT /api/settings/departments` - Update department settings
- `GET /api/settings/license-types` - Get Microsoft 365 license types
- `POST /api/settings/license-types` - Add a license type
- `PUT /api/settings/license-types/:id` - Update a license type
- `DELETE /api/settings/license-types/:id` - Delete a license type
- `GET /api/settings/whatsapp` - Get WhatsApp integration settings
- `PUT /api/settings/whatsapp` - Update WhatsApp integration settings

### Database Configuration
- `GET /api/settings/database-config` - Get current database configuration
- `PUT /api/settings/database-config` - Update database configuration
- `POST /api/settings/database-config/test` - Test a database connection

### Active Directory
- `GET /api/settings/active-directory` - Get Active Directory configuration
- `PUT /api/settings/active-directory` - Update Active Directory configuration
- `POST /api/settings/active-directory/test` - Test Active Directory connection
- `GET /api/settings/active-directory/users` - Search Active Directory users
- `POST /api/settings/active-directory/create-user` - Create a user in Active Directory

### Users Management
- `GET /api/users` - Get all system users (admin only)
- `POST /api/users` - Create a new system user (admin only)
- `PUT /api/users/:id` - Update an existing user (admin only)
- `DELETE /api/users/:id` - Delete a user (admin only)

### WhatsApp Integration
- `POST /api/whatsapp/send` - Send a WhatsApp message

## Docker Deployment

### Prerequisites
- Docker installed on your system
- Docker Compose installed on your system

### Docker Deployment Steps

1. The project already includes Dockerfiles for both frontend and backend:
   - `Dockerfile.frontend`: Builds and serves the React frontend using Nginx
   - `Dockerfile.backend`: Builds and runs the Node.js backend

2. The project includes a `docker-compose.yml` file that defines both services:
   ```yaml
   version: '3.8'

   services:
     backend:
       build:
         context: .
         dockerfile: Dockerfile.backend
       env_file: .env.production
       ports:
         - "9002:3001"
       restart: unless-stopped

     frontend:
       build:
         context: .
         dockerfile: Dockerfile.frontend
         args:
           VITE_API_URL: /api
       depends_on:
         - backend
       ports:
         - "9001:80"
       restart: unless-stopped
   ```

3. Create a `.env.production` file for your environment variables:
   ```
   DB_TYPE=mssql
   DB_HOST=your-db-host
   DB_PORT=1433
   DB_NAME=mti_onboarding
   DB_USER=your-db-user
   DB_PASSWORD=your-secure-password
   DB_INSTANCE=
   DB_ENCRYPT=false

   PORT=3001
   JWT_SECRET=your-secure-secret-key

   DB_INIT_SCHEMA=true
   DB_DROP_TABLES=false

   LOG_LEVEL=info
   LOG_API=true
   LOG_DB=true
   LOG_UI=false

   BCRYPT_SALT_ROUNDS=10
   ```

4. Build and run the Docker containers:
   ```
   docker-compose up -d
   ```

5. Access the application:
   - Frontend: http://localhost:9001
   - Backend API: http://localhost:9002

### Database Integration with Docker

To integrate with an external database:

1. Update your `.env.production` file with the correct database credentials.

2. If you want to run a database container, add the following to your `docker-compose.yml`:
   ```yaml
   db:
     image: mcr.microsoft.com/mssql/server:2022-latest
     environment:
       - ACCEPT_EULA=Y
       - SA_PASSWORD=YourStrongPassword123!
       - MSSQL_PID=Express
     ports:
       - "1433:1433"
     volumes:
       - mssql_data:/var/opt/mssql
     restart: unless-stopped

   volumes:
     mssql_data:
   ```

3. Update the backend service to depend on the database:
   ```yaml
   backend:
     # ... existing config
     depends_on:
       - db
     environment:
       - DB_HOST=db
       # ... other environment variables
   ```

### Production Considerations

1. **Security:**
   - Use environment variables for all sensitive information
   - Generate a strong JWT_SECRET for production
   - Consider using Docker secrets in swarm mode
   - For MSSQL, use a non-SA account with appropriate permissions

2. **SSL/TLS:**
   - For production, configure Nginx with proper SSL certificates
   - Consider adding a reverse proxy like Traefik or Nginx Proxy Manager

3. **Monitoring & Logging:**
   - Consider adding monitoring tools (Prometheus, Grafana)
   - Set up centralized logging (ELK stack or similar)

4. **Scaling:**
   - The application can be horizontally scaled
   - Consider adding a load balancer for multiple backend instances

## Troubleshooting

### Common Issues

1. **Database Connection Issues:**
   - Verify database credentials in .env file
   - Ensure the database server is accessible from the Docker network
   - Check firewall settings if connecting to an external database

2. **WhatsApp API Integration:**
   - Verify the WhatsApp API URL in settings
   - Ensure proper network connectivity to the WhatsApp API server
   - Check logs for detailed error messages

3. **Active Directory Integration:**
   - Verify LDAP connection parameters
   - Ensure proper network connectivity to the AD server
   - Confirm user permissions for AD operations

### Accessing Logs

To view logs from the Docker containers:

```
docker-compose logs -f backend
docker-compose logs -f frontend
```

## License

This project is proprietary software of PT. Merdeka Tsingshan Indonesia.
