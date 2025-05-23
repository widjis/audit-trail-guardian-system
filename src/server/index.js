
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
import logger from './utils/logger.js';
import hrisSyncRouter from './routes/hris-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS middleware
app.use(cors());

// Increase the payload limit to handle larger JSON requests (now 50MB)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// JWT Authentication middleware
import { extractUser } from './middleware/authMiddleware.js';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hires', extractUser, hiresRoutes);
app.use('/api/users', extractUser, usersRoutes);
app.use('/api/settings', extractUser, settingsRoutes);
app.use('/api/database', extractUser, dbRoutes);
app.use('/api/whatsapp', extractUser, whatsappRoutes);
app.use('/api/ad', extractUser, adRoutes);
app.use('/api/hris-sync', hrisSyncRouter);

// Simple healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Set port
const PORT = process.env.PORT || 3001;

// NOTE: We've moved the database initialization to start.js
// Do not initialize database connection here to avoid multiple connections

export default app;
