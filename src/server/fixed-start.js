// Using ES module import instead of CommonJS require
import app from './fixed-index.js';
import { initDbConnection } from './utils/dbConnection.js';
import { initializeSchema } from './utils/schemaInit.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3001;

// Initialize database first and then start the server
async function startServer() {
  try {
    // Initialize database connection
    await initDbConnection();
    
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
      logger.api.info(`Fixed server running on port ${PORT}`);
    });
  } catch (err) {
    logger.api.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();