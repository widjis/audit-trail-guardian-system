import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { extractUser } from './middleware/authMiddleware.js';
import { getCurrentUser } from './middleware/userMiddleware.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for all routes
app.use(cors());

// JSON body parser
app.use(express.json());

// URL encoded body parser
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Custom middleware to attach user object to request
app.use(extractUser);
app.use(getCurrentUser);

// Import routes
import authRoutes from './routes/auth.js';
import hiresRoutes from './routes/hires.js';
import hiresRbacRoutes from './routes/hires-rbac.js';
import settingsRoutes from './routes/settings.js';
import databaseRoutes from './routes/database.js';
import usersRoutes from './routes/users.js';
import whatsappRoutes from './routes/whatsapp.js';
import activeDirectoryRoutes from './routes/active-directory.js';
import hrisSyncRoutes from './routes/hris-sync.js';
import distributionListsRoutes from './routes/distribution-lists.js';
import userPreferencesRoutes from './routes/user-preferences.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hires', hiresRoutes); // Legacy routes for backward compatibility
app.use('/api/hires-rbac', hiresRbacRoutes); // New RBAC-enabled routes
app.use('/api/settings', settingsRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/active-directory', activeDirectoryRoutes);
app.use('/api/hris-sync', hrisSyncRoutes);
app.use('/api/distribution-lists', distributionListsRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  app.use('/uploads', express.static('/var/data/uploads'));
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../client/dist/index.html'))
  );
} else {
  app.get('/', (req, res) => {
    res.send('API is running....');
  });
}

// Custom error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;