
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDbConnection } from './utils/dbConnection.js';
import { initializeSchema } from './utils/schemaInit.js';

// Get current directory path using ES module approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HIRES_FILE = path.join(DATA_DIR, 'hires.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'auditLogs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files if they don't exist
const initializeDataFile = (filePath, initialData) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialData), 'utf8');
  }
};

// Initialize files with default data
initializeDataFile(USERS_FILE, [
  {
    id: "1",
    username: "admin",
    password: "password123",
    role: "admin",
  }
]);
initializeDataFile(HIRES_FILE, []);
initializeDataFile(AUDIT_LOGS_FILE, []);
initializeDataFile(SETTINGS_FILE, {
  accountStatuses: ["Pending", "Active", "Inactive", "Suspended"],
  mailingLists: [
    { id: "1", name: "General Updates", isDefault: true },
    { id: "2", name: "Technical Team", isDefault: false },
    { id: "3", name: "Marketing", isDefault: false },
    { id: "4", name: "Management", isDefault: false }
  ],
  departments: [
    { id: "1", name: "Engineering", code: "ENG" },
    { id: "2", name: "Human Resources", code: "HR" },
    { id: "3", name: "Finance", code: "FIN" },
    { id: "4", name: "Marketing", code: "MKT" },
    { id: "5", name: "Sales", code: "SLS" }
  ],
  mailingListDisplayAsDropdown: true
});

// Helper functions
const readDataFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }
  return null;
};

const writeDataFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Simulate JWT token
const generateToken = (userId, username, role) => {
  return Buffer.from(JSON.stringify({ userId, username, role, exp: Date.now() + 3600000 })).toString('base64');
};

// Initialize database connection
(async () => {
  try {
    const dbConnected = await initDbConnection();
    console.log(`Database connection ${dbConnected ? 'successful' : 'failed'}`);
    
    if (dbConnected) {
      // Initialize schema if database is connected
      const schemaInitialized = await initializeSchema();
      console.log(`Schema initialization ${schemaInitialized ? 'successful' : 'failed or not needed'}`);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})();

// API Routes
// Import API route modules (converting to ES module imports)
import authRoutes from './routes/auth.js';
import hiresRoutes from './routes/hires.js';
import settingsRoutes from './routes/settings.js';
import databaseRoutes from './routes/database.js';
import usersRoutes from './routes/users.js';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/hires', hiresRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/settings/database-config', databaseRoutes);
app.use('/api/users', usersRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
