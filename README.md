
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
