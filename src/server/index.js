
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

// Import routes
import authRoutes from './routes/auth.js';
import hiresRoutes from './routes/hires.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import dbRoutes from './routes/database.js';
import whatsappRoutes from './routes/whatsapp.js';
import adRoutes from './routes/active-directory.js';
import { checkDatabaseConnection, generateFakeData } from './utils/dbConnection.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS middleware
app.use(cors());

// Increase the payload limit to handle larger JSON requests (now 10MB)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// JWT Authentication middleware
import authMiddleware from './middleware/authMiddleware.js';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hires', authMiddleware, hiresRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/database', authMiddleware, dbRoutes);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);
app.use('/api/ad', authMiddleware, adRoutes);

// Simple healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Set port
const PORT = process.env.PORT || 3001;

export default app;
