
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { enhancedErrorHandler, asyncHandler } from './utils/errorHandling.js';
import { extractUser } from './middleware/authMiddleware.js';
import { getCurrentUser } from './middleware/userMiddleware.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for all routes with enhanced configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || false 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));

// URL encoded body parser with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Custom middleware to attach user object to request
app.use(extractUser);
app.use(getCurrentUser);

// Health check endpoint
app.get('/health', asyncHandler(async (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
}));

// Basic test routes
app.get('/', (req, res) => {
  res.send('API is running....');
});

app.get('/api/test', asyncHandler(async (req, res) => {
  res.json({ message: 'API test successful' });
}));

// Import routes
import authRoutes from './routes/auth.js';
import hiresRoutes from './routes/hires.js';
import settingsRoutes from './routes/settings.js';
import databaseRoutes from './routes/database.js';
import usersRoutes from './routes/users.js';
import whatsappRoutes from './routes/whatsapp.js';
import activeDirectoryRoutes from './routes/active-directory.ts';
import hrisSyncRoutes from './routes/hris-sync.js';
import distributionListsRoutes from './routes/distribution-lists.js';
import userPreferencesRoutes from './routes/user-preferences.js';
import testPreferencesRoutes from './routes/test-preferences.js';
import systemConfigRoutes from './routes/system-config.js';

// Test route before other routes
app.get('/api/test-get', asyncHandler(async (req, res) => {
  res.json({ message: 'Test GET route works' });
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hires', hiresRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/active-directory', activeDirectoryRoutes);
app.use('/api/hris-sync', hrisSyncRoutes);
app.use('/api/distribution-lists', distributionListsRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);
app.use('/api/test-preferences', testPreferencesRoutes);
app.use('/api/system-config', systemConfigRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  app.use('/uploads', express.static('/var/data/uploads'));
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../client/dist/index.html'))
  );
} else {
  const __dirname = path.resolve();
  app.get('/', (req, res) => {
    res.send('API is running....');
  });
}

// Enhanced error handling middleware
app.use(notFound);
app.use(enhancedErrorHandler);
app.use(errorHandler); // Fallback error handler

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
