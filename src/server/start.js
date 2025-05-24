
// Using ES module import instead of CommonJS require
import app from './index.js';
import { initDbConnection } from './utils/dbConnection.js';
import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncToActiveDirectory } from './services/hrisSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;

// Check for scheduled tasks
async function checkScheduledTasks() {
  try {
    const scheduleSettingsPath = path.join(__dirname, './data/scheduleSettings.json');
    
    if (!fs.existsSync(scheduleSettingsPath)) {
      return;
    }
    
    const settings = JSON.parse(fs.readFileSync(scheduleSettingsPath, 'utf8'));
    
    if (settings.enabled && settings.nextRun) {
      const nextRun = new Date(settings.nextRun);
      const now = new Date();
      
      if (now >= nextRun) {
        logger.api.info('Running scheduled HRIS sync');
        
        try {
          // Run sync
          const result = await syncToActiveDirectory(false);
          
          // Update last run and calculate next run
          settings.lastRun = new Date().toISOString();
          
          // Calculate next run based on frequency
          const calculateNext = () => {
            const now = new Date();
            switch (settings.frequency) {
              case 'daily':
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                return tomorrow;
              case 'weekly':
                const nextWeek = new Date(now);
                // Set to next Sunday
                nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
                nextWeek.setHours(0, 0, 0, 0);
                return nextWeek;
              case 'monthly':
                const nextMonth = new Date(now);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                nextMonth.setDate(1);
                nextMonth.setHours(0, 0, 0, 0);
                return nextMonth;
              default:
                const nextDay = new Date(now);
                nextDay.setDate(nextDay.getDate() + 1);
                nextDay.setHours(0, 0, 0, 0);
                return nextDay;
            }
          };
          
          settings.nextRun = calculateNext().toISOString();
          fs.writeFileSync(scheduleSettingsPath, JSON.stringify(settings, null, 2));
          
          logger.api.info(`HRIS sync completed. Next run scheduled for ${settings.nextRun}`);
        } catch (syncError) {
          logger.api.error('Scheduled HRIS sync failed:', syncError);
        }
      }
    }
  } catch (err) {
    logger.api.error('Error checking scheduled tasks:', err);
  }
}

// Initialize database first and then start the server
async function startServer() {
  try {
    // Initialize database connection
    await initDbConnection();
    
    // Start the Express server
    app.listen(PORT, () => {
      logger.api.info(`Server running on port ${PORT}`);
      
      // Check for scheduled tasks every minute
      setInterval(checkScheduledTasks, 60000);
    });
  } catch (err) {
    logger.api.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
