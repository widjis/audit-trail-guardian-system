
// Using ES module import instead of CommonJS require
import app from './index.js';
import { initDbConnection } from './utils/dbConnection.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3001;

// Initialize database first and then start the server
async function startServer() {
  try {
    // Initialize database connection
    await initDbConnection();
    
    // Start the Express server
    app.listen(PORT, () => {
      logger.api.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.api.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
