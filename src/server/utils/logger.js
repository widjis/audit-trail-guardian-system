
/**
 * Centralized logger utility for backend
 * Controls logging based on environment variables
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const ENV_FILE_PATH = path.join(__dirname, '../../../.env');
if (fs.existsSync(ENV_FILE_PATH)) {
  dotenv.config({ path: ENV_FILE_PATH });
}

// Log levels in order of verbosity
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

// Default configuration
const defaultConfig = {
  level: 'info',    // Default log level
  enableApi: true,  // API logs enabled by default
  enableDb: true,   // Database logs enabled by default
};

// Get configuration from environment variables
const getLoggerConfig = () => {
  return {
    level: process.env.LOG_LEVEL || defaultConfig.level,
    enableApi: process.env.LOG_API !== 'false', 
    enableDb: process.env.LOG_DB !== 'false',
  };
};

// Current logger configuration
const config = getLoggerConfig();

// Check if a log should be shown based on its level
const shouldLog = (level) => {
  const configLevel = LOG_LEVELS[config.level] || LOG_LEVELS.info;
  const messageLevel = LOG_LEVELS[level];
  return messageLevel >= configLevel;
};

// Format the current time for logs
const getTimeStamp = () => {
  return new Date().toISOString();
};

// Logger object with methods for different components
const logger = {
  // API endpoint related logs
  api: {
    debug: (message, ...args) => {
      if (config.enableApi && shouldLog('debug')) {
        console.debug(`[${getTimeStamp()}] [API] [DEBUG] ${message}`, ...args);
      }
    },
    info: (message, ...args) => {
      if (config.enableApi && shouldLog('info')) {
        console.info(`[${getTimeStamp()}] [API] [INFO] ${message}`, ...args);
      }
    },
    warn: (message, ...args) => {
      if (config.enableApi && shouldLog('warn')) {
        console.warn(`[${getTimeStamp()}] [API] [WARN] ${message}`, ...args);
      }
    },
    error: (message, ...args) => {
      if (config.enableApi && shouldLog('error')) {
        console.error(`[${getTimeStamp()}] [API] [ERROR] ${message}`, ...args);
      }
    },
  },

  // Database related logs
  db: {
    debug: (message, ...args) => {
      if (config.enableDb && shouldLog('debug')) {
        console.debug(`[${getTimeStamp()}] [Database] [DEBUG] ${message}`, ...args);
      }
    },
    info: (message, ...args) => {
      if (config.enableDb && shouldLog('info')) {
        console.info(`[${getTimeStamp()}] [Database] [INFO] ${message}`, ...args);
      }
    },
    warn: (message, ...args) => {
      if (config.enableDb && shouldLog('warn')) {
        console.warn(`[${getTimeStamp()}] [Database] [WARN] ${message}`, ...args);
      }
    },
    error: (message, ...args) => {
      if (config.enableDb && shouldLog('error')) {
        console.error(`[${getTimeStamp()}] [Database] [ERROR] ${message}`, ...args);
      }
    },
    query: (sql, params, timing = null) => {
      if (config.enableDb && shouldLog('debug')) {
        console.debug(`[${getTimeStamp()}] [Database] [QUERY] ${sql}`);
        if (params && params.length) {
          console.debug(`[${getTimeStamp()}] [Database] [PARAMS]`, JSON.stringify(params));
        }
        if (timing) {
          console.debug(`[${getTimeStamp()}] [Database] [TIMING] ${timing}ms`);
        }
      }
    },
    result: (message, data) => {
      if (config.enableDb && shouldLog('debug')) {
        console.debug(`[${getTimeStamp()}] [Database] [RESULT] ${message}`, 
          typeof data === 'object' ? JSON.stringify(data) : data);
      }
    }
  },
};

export default logger;
