
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import hiresRoutes from './routes/hires.js';
import settingsRoutes from './routes/settings.js';
import databaseRoutes from './routes/database.js';
import { initDbConnection } from './utils/dbConnection.js';
import { initSchema } from './utils/schemaInit.js';
import { initMS365Schema } from './utils/ms365SchemaInit.js';
import logger from './utils/logger.js';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/hires', hiresRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/database', databaseRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../../dist')));

// Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database connection
    const dbConnected = await initDbConnection();
    if (!dbConnected) {
      logger.server.error('Failed to connect to database, starting server anyway');
    } else {
      // Initialize schema
      const schemaInitialized = await initSchema();
      if (!schemaInitialized) {
        logger.server.error('Failed to initialize schema, starting server anyway');
      }
      
      // Initialize MS365 license types schema
      const ms365SchemaInitialized = await initMS365Schema();
      if (!ms365SchemaInitialized) {
        logger.server.error('Failed to initialize MS365 license types schema, starting server anyway');
      }
    }
    
    // Start the server
    app.listen(PORT, () => {
      logger.server.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.server.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
