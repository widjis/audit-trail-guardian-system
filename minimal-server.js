// Minimal backend server test
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8082'],
  credentials: true
}));

// JSON body parser
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend API is running!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple mock authentication - in production, this would validate against a database
  if (username && password) {
    // Mock successful login
    const mockUser = {
      id: 1,
      username: username,
      email: `${username}@company.com`,
      role: 'admin'
    };
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    
    res.json({
      success: true,
      token: mockToken,
      user: mockUser,
      message: 'Login successful'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;
  
  // Simple mock registration
  if (username && password) {
    const mockUser = {
      id: Date.now(),
      username: username,
      email: email || `${username}@company.com`,
      role: 'user'
    };
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    
    res.json({
      success: true,
      token: mockToken,
      user: mockUser,
      message: 'Registration successful'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }
});

app.post('/api/auth/verify-token', (req, res) => {
  const { token } = req.body;
  const authHeader = req.headers.authorization;
  
  // Simple mock token verification
  if (token || authHeader) {
    res.json({
      valid: true,
      message: 'Token is valid'
    });
  } else {
    res.status(401).json({
      valid: false,
      message: 'Invalid or missing token'
    });
  }
});

// Dashboard/metrics routes
app.get('/api/dashboard/metrics', (req, res) => {
  res.json({
    totalHires: 156,
    pendingOnboarding: 23,
    completedOnboarding: 133,
    activeUsers: 89,
    recentActivity: [
      { id: 1, action: 'User onboarded', user: 'John Doe', timestamp: new Date().toISOString() },
      { id: 2, action: 'HRIS sync completed', user: 'System', timestamp: new Date().toISOString() },
      { id: 3, action: 'New hire added', user: 'Jane Smith', timestamp: new Date().toISOString() }
    ]
  });
});

// Users routes
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@company.com', status: 'active', role: 'admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@company.com', status: 'active', role: 'user' },
    { id: 3, name: 'Bob Johnson', email: 'bob@company.com', status: 'pending', role: 'user' }
  ]);
});

// Hires routes
app.get('/api/hires', (req, res) => {
  res.json([
    { 
      id: 1, 
      name: 'Alice Wilson', 
      email: 'alice@company.com', 
      department: 'Engineering', 
      position: 'Software Developer',
      startDate: '2024-01-15',
      status: 'completed',
      progress: 100
    },
    { 
      id: 2, 
      name: 'Charlie Brown', 
      email: 'charlie@company.com', 
      department: 'Marketing', 
      position: 'Marketing Specialist',
      startDate: '2024-01-20',
      status: 'in-progress',
      progress: 65
    },
    { 
      id: 3, 
      name: 'Diana Prince', 
      email: 'diana@company.com', 
      department: 'HR', 
      position: 'HR Coordinator',
      startDate: '2024-01-25',
      status: 'pending',
      progress: 0
    }
  ]);
});

app.get('/api/hires/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const hire = {
    id: id,
    name: 'Sample User',
    email: 'sample@company.com',
    department: 'Engineering',
    position: 'Software Developer',
    startDate: '2024-01-15',
    status: 'in-progress',
    progress: 75
  };
  res.json(hire);
});

app.post('/api/hires', (req, res) => {
  const newHire = {
    id: Date.now(),
    ...req.body,
    status: 'pending',
    progress: 0
  };
  res.json(newHire);
});

app.put('/api/hires/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const updatedHire = {
    id: id,
    ...req.body
  };
  res.json(updatedHire);
});

app.delete('/api/hires/:id', (req, res) => {
  res.json({ success: true, message: 'Hire deleted successfully' });
});

// Users service routes
app.get('/api/users/support', (req, res) => {
  res.json([
    { id: 1, name: 'Support Admin', email: 'support@company.com', role: 'support', status: 'active' },
    { id: 2, name: 'Help Desk', email: 'helpdesk@company.com', role: 'support', status: 'active' }
  ]);
});

app.get('/api/users/pending', (req, res) => {
  res.json([
    { id: 3, name: 'Pending User', email: 'pending@company.com', role: 'user', status: 'pending' }
  ]);
});

app.post('/api/users', (req, res) => {
  const newUser = {
    id: Date.now(),
    ...req.body,
    status: 'pending'
  };
  res.json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const updatedUser = {
    id: id,
    ...req.body
  };
  res.json(updatedUser);
});

app.post('/api/users/:id/approve', (req, res) => {
  res.json({ success: true, message: 'User approved successfully' });
});

app.post('/api/users/:id/disapprove', (req, res) => {
  res.json({ success: true, message: 'User disapproved successfully' });
});

app.delete('/api/users/:id', (req, res) => {
  res.json({ success: true, message: 'User deleted successfully' });
});

app.post('/api/users/:id/reset-password', (req, res) => {
  res.json({ success: true, message: 'Password reset successfully' });
});

// Settings routes
app.get('/api/settings', (req, res) => {
  res.json({
    accountStatuses: ['Active', 'Inactive', 'Pending'],
    mailingLists: ['All Staff', 'Managers', 'HR'],
    departments: ['Engineering', 'Marketing', 'HR', 'Sales'],
    licenseTypes: ['E1', 'E3', 'E5', 'F1', 'F3']
  });
});

app.put('/api/settings/account-statuses', (req, res) => {
  res.json({ success: true, message: 'Account statuses updated successfully' });
});

app.put('/api/settings/mailing-lists', (req, res) => {
  res.json({ success: true, message: 'Mailing lists updated successfully' });
});

app.put('/api/settings/departments', (req, res) => {
  res.json({ success: true, message: 'Departments updated successfully' });
});

// Audit logs routes
app.get('/api/audit-logs', (req, res) => {
  res.json([
    {
      id: 1,
      action: 'User Login',
      user: 'admin',
      timestamp: new Date().toISOString(),
      details: 'Successful login'
    },
    {
      id: 2,
      action: 'Hire Created',
      user: 'admin',
      timestamp: new Date().toISOString(),
      details: 'New hire Alice Wilson created'
    }
  ]);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});