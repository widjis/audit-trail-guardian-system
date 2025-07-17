
/**
 * Centralized logger utility for backend
 * Controls logging based on environment variables
 * Enhanced with better LDAP error logging, audit trails, security logging, and performance monitoring
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
  level: 'info',     // Default log level
  enableApi: true,   // API logs enabled by default
  enableDb: true,    // Database logs enabled by default
  enableLdap: true,  // LDAP logs enabled by default
  enableAudit: true, // Audit logs enabled by default
  enableSecurity: true, // Security logs enabled by default
  enablePerformance: true, // Performance logs enabled by default
  logToFile: false,  // File logging disabled by default
  logPath: './logs'  // Default log file path
};

// Get configuration from environment variables
const getLoggerConfig = () => {
  return {
    level: process.env.LOG_LEVEL || defaultConfig.level,
    enableApi: process.env.LOG_API !== 'false', 
    enableDb: process.env.LOG_DB !== 'false',
    enableLdap: process.env.LOG_LDAP !== 'false',
    enableAudit: process.env.LOG_AUDIT !== 'false',
    enableSecurity: process.env.LOG_SECURITY !== 'false',
    enablePerformance: process.env.LOG_PERFORMANCE !== 'false',
    logToFile: process.env.LOG_TO_FILE === 'true',
    logPath: process.env.LOG_PATH || defaultConfig.logPath
  };
};

// Current logger configuration
const config = getLoggerConfig();

// Set up log directory if file logging is enabled
if (config.logToFile) {
  try {
    if (!fs.existsSync(config.logPath)) {
      fs.mkdirSync(config.logPath, { recursive: true });
    }
  } catch (err) {
    console.error(`Failed to create log directory at ${config.logPath}:`, err);
  }
}

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

// Write log to file if enabled
const writeLogToFile = (component, level, message, ...args) => {
  if (!config.logToFile) return;
  
  try {
    const timestamp = getTimeStamp();
    const date = timestamp.split('T')[0];
    const logFile = path.join(config.logPath, `${date}-${component.toLowerCase()}.log`);
    
    // Format args to string, handling objects
    const argsStr = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    
    const logEntry = `[${timestamp}] [${component}] [${level.toUpperCase()}] ${message} ${argsStr}\n`;
    
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error(`Failed to write to log file:`, err);
  }
};

// Helper to sanitize sensitive data from logs
const sanitizeForLog = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(obj));
  
  // List of fields that should be redacted
  const sensitiveFields = ['password', 'pwd', 'secret', 'token', 'key', 'unicodePwd', 'authorization'];
  
  // Recursively sanitize the object
  const sanitizeObj = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.includes(key.toLowerCase())) {
        if (obj[key]) {
          obj[key] = '[REDACTED]';
        }
      } else if (typeof obj[key] === 'object') {
        sanitizeObj(obj[key]);
      }
    });
  };
  
  sanitizeObj(sanitized);
  return sanitized;
};

// Create log function for a component
const createLoggerForComponent = (component) => {
  return {
    debug: (message, ...args) => {
      if (shouldLog('debug')) {
        console.debug(`[${getTimeStamp()}] [${component}] [DEBUG] ${message}`, ...args.map(sanitizeForLog));
        writeLogToFile(component, 'debug', message, ...args.map(sanitizeForLog));
      }
    },
    info: (message, ...args) => {
      if (shouldLog('info')) {
        console.info(`[${getTimeStamp()}] [${component}] [INFO] ${message}`, ...args.map(sanitizeForLog));
        writeLogToFile(component, 'info', message, ...args.map(sanitizeForLog));
      }
    },
    warn: (message, ...args) => {
      if (shouldLog('warn')) {
        console.warn(`[${getTimeStamp()}] [${component}] [WARN] ${message}`, ...args.map(sanitizeForLog));
        writeLogToFile(component, 'warn', message, ...args.map(sanitizeForLog));
      }
    },
    error: (message, ...args) => {
      if (shouldLog('error')) {
        console.error(`[${getTimeStamp()}] [${component}] [ERROR] ${message}`, ...args.map(sanitizeForLog));
        writeLogToFile(component, 'error', message, ...args.map(sanitizeForLog));
      }
    }
  };
};

// Logger object with methods for different components
const logger = {
  // API endpoint related logs
  api: config.enableApi ? createLoggerForComponent('API') : {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  },

  // Database related logs
  db: config.enableDb ? {
    ...createLoggerForComponent('Database'),
    query: (sql, params, timing = null) => {
      if (shouldLog('debug')) {
        console.debug(`[${getTimeStamp()}] [Database] [QUERY] ${sql}`);
        writeLogToFile('Database', 'query', sql);
        
        if (params && params.length) {
          console.debug(`[${getTimeStamp()}] [Database] [PARAMS]`, sanitizeForLog(params));
          writeLogToFile('Database', 'params', '', sanitizeForLog(params));
        }
        
        if (timing) {
          console.debug(`[${getTimeStamp()}] [Database] [TIMING] ${timing}ms`);
          writeLogToFile('Database', 'timing', `${timing}ms`);
        }
      }
    },
    result: (message, data) => {
      if (shouldLog('debug')) {
        const formattedData = typeof data === 'object' ? JSON.stringify(sanitizeForLog(data)) : data;
        console.debug(`[${getTimeStamp()}] [Database] [RESULT] ${message}`, formattedData);
        writeLogToFile('Database', 'result', message, formattedData);
      }
    }
  } : {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    query: () => {},
    result: () => {}
  },
  
  // LDAP/Active Directory specific logs
  ldap: config.enableLdap ? {
    ...createLoggerForComponent('LDAP'),
    
    // Log LDAP operations with detailed attributes
    operation: (operation, dn, attributes = null) => {
      if (shouldLog('debug')) {
        console.debug(`[${getTimeStamp()}] [LDAP] [OPERATION] ${operation} on DN: ${dn}`);
        writeLogToFile('LDAP', 'operation', `${operation} on DN: ${dn}`);
        
        if (attributes) {
          const safeAttributes = sanitizeForLog(attributes);
          console.debug(`[${getTimeStamp()}] [LDAP] [ATTRIBUTES]`, JSON.stringify(safeAttributes));
          writeLogToFile('LDAP', 'attributes', '', safeAttributes);
        }
      }
    },
    
    // Log LDAP errors with code interpretation
    errorDetail: (err) => {
      if (shouldLog('error')) {
        console.error(`[${getTimeStamp()}] [LDAP] [ERROR-DETAIL] ${err.name}: ${err.message}`);
        writeLogToFile('LDAP', 'error-detail', `${err.name}: ${err.message}`);
        
        // Interpret LDAP error codes
        if (err.code) {
          let interpretation = "Unknown error code";
          
          // Common LDAP error codes and their meanings
          switch (err.code) {
            case 0: interpretation = "Success"; break;
            case 1: interpretation = "Operations error"; break;
            case 2: interpretation = "Protocol error"; break;
            case 3: interpretation = "Time limit exceeded"; break;
            case 4: interpretation = "Size limit exceeded"; break;
            case 5: interpretation = "Compare false"; break;
            case 6: interpretation = "Compare true"; break;
            case 7: interpretation = "Authentication method not supported"; break;
            case 8: interpretation = "Strong authentication required"; break;
            case 10: interpretation = "Referral"; break;
            case 11: interpretation = "Administrative limit exceeded"; break;
            case 12: interpretation = "Unavailable critical extension"; break;
            case 13: interpretation = "Confidentiality required"; break;
            case 14: interpretation = "SASL bind in progress"; break;
            case 16: interpretation = "No such attribute"; break;
            case 17: interpretation = "Undefined attribute type"; break;
            case 18: interpretation = "Inappropriate matching"; break;
            case 19: interpretation = "Constraint violation"; break;
            case 20: interpretation = "Attribute or value exists"; break;
            case 21: interpretation = "Invalid attribute syntax"; break;
            case 32: interpretation = "No such object"; break;
            case 33: interpretation = "Alias problem"; break;
            case 34: interpretation = "Invalid DN syntax"; break;
            case 35: interpretation = "Is leaf"; break;
            case 36: interpretation = "Alias dereferencing problem"; break;
            case 48: interpretation = "Inappropriate authentication"; break;
            case 49: interpretation = "Invalid credentials"; break;
            case 50: interpretation = "Insufficient access rights"; break;
            case 51: interpretation = "Busy"; break;
            case 52: interpretation = "Unavailable"; break;
            case 53: interpretation = "Unwilling to perform"; break;
            case 54: interpretation = "Loop detect"; break;
            case 64: interpretation = "Naming violation"; break;
            case 65: interpretation = "Object class violation"; break;
            case 66: interpretation = "Not allowed on non-leaf"; break;
            case 67: interpretation = "Not allowed on RDN"; break;
            case 68: interpretation = "Entry already exists"; break;
            case 69: interpretation = "Object class modifications prohibited"; break;
            case 71: interpretation = "Affects multiple DSAs"; break;
            case 80: interpretation = "Other"; break;
          }
          
          console.error(`[${getTimeStamp()}] [LDAP] [ERROR-CODE] Code ${err.code}: ${interpretation}`);
          writeLogToFile('LDAP', 'error-code', `Code ${err.code}: ${interpretation}`);
        }
      }
    },
    
    // Log LDAP connection status changes
    connection: (status, server, details = null) => {
      if (shouldLog('info')) {
        console.info(`[${getTimeStamp()}] [LDAP] [CONNECTION] ${status} to ${server}`);
        writeLogToFile('LDAP', 'connection', `${status} to ${server}`);
        
        if (details) {
          console.info(`[${getTimeStamp()}] [LDAP] [CONNECTION-DETAILS]`, details);
          writeLogToFile('LDAP', 'connection-details', '', details);
        }
      }
    }
  } : {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    operation: () => {},
    errorDetail: () => {},
    connection: () => {}
  },

  // Audit trail logging
  audit: config.enableAudit ? {
    ...createLoggerForComponent('AUDIT'),
    
    userAction: (userId, action, details = {}) => {
      const logData = {
        userId,
        action,
        details: sanitizeForLog(details),
        timestamp: getTimeStamp(),
        type: 'user_action'
      };
      console.info(`[${getTimeStamp()}] [AUDIT] [USER-ACTION] User ${userId} performed ${action}`, logData);
      writeLogToFile('AUDIT', 'user-action', `User ${userId} performed ${action}`, logData);
    },
    
    systemEvent: (event, details = {}) => {
      const logData = {
        event,
        details: sanitizeForLog(details),
        timestamp: getTimeStamp(),
        type: 'system_event'
      };
      console.info(`[${getTimeStamp()}] [AUDIT] [SYSTEM-EVENT] ${event}`, logData);
      writeLogToFile('AUDIT', 'system-event', event, logData);
    },
    
    dataAccess: (userId, resource, operation, details = {}) => {
      const logData = {
        userId,
        resource,
        operation,
        details: sanitizeForLog(details),
        timestamp: getTimeStamp(),
        type: 'data_access'
      };
      console.info(`[${getTimeStamp()}] [AUDIT] [DATA-ACCESS] User ${userId} ${operation} ${resource}`, logData);
      writeLogToFile('AUDIT', 'data-access', `User ${userId} ${operation} ${resource}`, logData);
    }
  } : {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    userAction: () => {},
    systemEvent: () => {},
    dataAccess: () => {}
  },

  // Security logging
  security: config.enableSecurity ? {
    ...createLoggerForComponent('SECURITY'),
    
    authAttempt: (email, success, ip, details = {}) => {
      const logLevel = success ? 'info' : 'warn';
      const logData = {
        email,
        success,
        ip,
        details: sanitizeForLog(details),
        timestamp: getTimeStamp(),
        type: 'auth_attempt'
      };
      console[logLevel](`[${getTimeStamp()}] [SECURITY] [AUTH-ATTEMPT] ${success ? 'Successful' : 'Failed'} login for ${email} from ${ip}`, logData);
      writeLogToFile('SECURITY', 'auth-attempt', `${success ? 'Successful' : 'Failed'} login for ${email} from ${ip}`, logData);
    },
    
    suspiciousActivity: (userId, activity, details = {}) => {
      const logData = {
        userId,
        activity,
        details: sanitizeForLog(details),
        timestamp: getTimeStamp(),
        type: 'suspicious_activity'
      };
      console.error(`[${getTimeStamp()}] [SECURITY] [SUSPICIOUS] User ${userId} - ${activity}`, logData);
      writeLogToFile('SECURITY', 'suspicious', `User ${userId} - ${activity}`, logData);
    },
    
    securityEvent: (event, severity, details = {}) => {
      const logData = {
        event,
        severity,
        details: sanitizeForLog(details),
        timestamp: getTimeStamp(),
        type: 'security_event'
      };
      console.warn(`[${getTimeStamp()}] [SECURITY] [EVENT] ${severity} - ${event}`, logData);
      writeLogToFile('SECURITY', 'event', `${severity} - ${event}`, logData);
    }
  } : {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    authAttempt: () => {},
    suspiciousActivity: () => {},
    securityEvent: () => {}
  },

  // Performance monitoring
  performance: config.enablePerformance ? {
    ...createLoggerForComponent('PERFORMANCE'),
    
    metric: (metric, value, context = {}) => {
      const logData = {
        metric,
        value,
        context: sanitizeForLog(context),
        timestamp: getTimeStamp(),
        type: 'performance_metric'
      };
      console.info(`[${getTimeStamp()}] [PERFORMANCE] [METRIC] ${metric}: ${value}`, logData);
      writeLogToFile('PERFORMANCE', 'metric', `${metric}: ${value}`, logData);
    },
    
    slowQuery: (query, duration, rowCount = null) => {
      const logData = {
        query: query.substring(0, 200), // Truncate long queries
        duration,
        rowCount,
        timestamp: getTimeStamp(),
        type: 'slow_query'
      };
      console.warn(`[${getTimeStamp()}] [PERFORMANCE] [SLOW-QUERY] ${duration}ms - ${query.substring(0, 100)}...`, logData);
      writeLogToFile('PERFORMANCE', 'slow-query', `${duration}ms - ${query.substring(0, 100)}...`, logData);
    },
    
    slowRequest: (method, url, duration, statusCode, userId = null) => {
      const logData = {
        method,
        url,
        duration,
        statusCode,
        userId,
        timestamp: getTimeStamp(),
        type: 'slow_request'
      };
      console.warn(`[${getTimeStamp()}] [PERFORMANCE] [SLOW-REQUEST] ${method} ${url} - ${duration}ms (${statusCode})`, logData);
      writeLogToFile('PERFORMANCE', 'slow-request', `${method} ${url} - ${duration}ms (${statusCode})`, logData);
    }
  } : {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    metric: () => {},
    slowQuery: () => {},
    slowRequest: () => {}
  }
};

export default logger;
