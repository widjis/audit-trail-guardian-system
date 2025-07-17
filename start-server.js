// Simple server start script using only compiled JavaScript files
import app from './src/server/index.js';
import { initDbConnection, getDbPool } from './src/server/utils/dbConnection.js';
import { initializeSchema } from './src/server/utils/schemaInit.js';
import logger from './src/server/utils/logger.js';

const PORT = process.env.PORT || 3001;

// Initialize database first and then start the server
async function startServer() {
  try {
    // Initialize database connection
    await initDbConnection();
    
    // Set database pool in app locals for routes to access
    app.locals.dbPool = getDbPool();
    logger.api.info('Database pool set in app locals');
    
    // Initialize database schema
    logger.api.info('Initializing database schema...');
    const schemaInitSuccess = await initializeSchema();
    if (schemaInitSuccess) {
      logger.api.info('Database schema initialization completed successfully');
    } else {
      logger.api.warn('Database schema initialization failed, but continuing startup');
    }
    
    // Start the Express server
    app.listen(PORT, () => {
      logger.api.info(`Server running on port ${PORT}`);
      console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.api.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();