
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

## Docker Deployment

### Prerequisites
- Docker installed on your system
- Docker Compose installed on your system

### Docker Deployment Steps

1. Create a `Dockerfile` in the root directory:
```
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the frontend
RUN npm run build

EXPOSE 3001

CMD ["node", "src/server/start.js"]
```

2. Create a `.dockerignore` file:
```
node_modules
dist
.git
.env
.vscode
```

3. Create a `docker-compose.yml` file:
```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DB_TYPE=mssql
      - DB_HOST=db
      - DB_PORT=1433
      - DB_NAME=mti_onboarding
      - DB_USER=sa
      - DB_PASSWORD=YourStrongPassword123!
      - DB_ENCRYPT=false
      - JWT_SECRET=your_secret_key_here
      - PORT=3001
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    ports:
      - "1433:1433"
    volumes:
      - mssql_data:/var/opt/mssql
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrongPassword123!
      - MSSQL_PID=Express
    restart: unless-stopped

volumes:
  mssql_data:
```

4. Create or modify `.env` file for your production environment:
```
DB_TYPE=mssql
DB_HOST=db
DB_PORT=1433
DB_NAME=mti_onboarding
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
DB_INSTANCE=
DB_ENCRYPT=false

PORT=3001
JWT_SECRET=your_secure_secret_key_here

DB_INIT_SCHEMA=true
DB_DROP_TABLES=false

LOG_LEVEL=info
LOG_API=true
LOG_DB=true
LOG_UI=false

BCRYPT_SALT_ROUNDS=10
```

5. Build and run the Docker containers:
```
docker-compose up -d
```

6. Access the application:
   - The application will be available at http://localhost:3001

### Docker Production Deployment Considerations

1. **Security:**
   - Use environment variables for all sensitive information
   - Generate a strong JWT_SECRET for production
   - Use Docker secrets for sensitive data in a swarm environment
   - For MSSQL, always use a strong SA password and consider using a non-SA account for the application

2. **Database:**
   - For production, use a managed database service or properly configured database with regular backups
   - Consider using a database initialization script
   - For MSSQL, configure proper memory limits based on your server capacity

3. **SSL/TLS:**
   - For production, configure a reverse proxy (like Nginx) with SSL certificates
   - You can add Nginx as a service in your docker-compose file

4. **Scaling:**
   - The application can be scaled horizontally for more traffic
   - Add a load balancer for multiple instances

5. **Monitoring:**
   - Add monitoring services like Prometheus and Grafana
   - Configure proper logging with a centralized log management system

## Backend API Endpoints

### Authentication
- POST /api/auth/login - Login
- POST /api/auth/register - Register
- POST /api/auth/verify-token - Verify token

### New Hires
- GET /api/hires - Get all hires
- GET /api/hires/:id - Get a specific hire
- POST /api/hires - Create a hire
- PUT /api/hires/:id - Update a hire
- DELETE /api/hires/:id - Delete a hire
- POST /api/hires/import - Import hires
- GET /api/hires/:id/logs - Get logs for a hire
- POST /api/hires/:id/logs - Create a log for a hire

### Settings
- GET /api/settings - Get all settings
- PUT /api/settings/account-status - Update account status settings
- PUT /api/settings/mailing-lists - Update mailing list settings
- PUT /api/settings/departments - Update department settings
