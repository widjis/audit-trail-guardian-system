
/**
 * Centralized logger utility for frontend
 * Controls logging based on environment variables
 * Enhanced with better formatting and additional components
 */

// Log levels in order of verbosity
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enableApi: boolean;
  enableUi: boolean;
  enableLdap: boolean; // Added LDAP logging option
  enableDb: boolean;   // Added database logging option
}

// Default configuration
const defaultConfig: LoggerConfig = {
  level: 'info',     // Default log level
  enableApi: true,   // API logs enabled by default
  enableUi: true,    // UI logs enabled by default
  enableLdap: true,  // LDAP logs enabled by default
  enableDb: true,    // Database logs enabled by default
};

// Get config from environment variables or use defaults
const getLoggerConfig = (): LoggerConfig => {
  // Read from env variables if available
  return {
    level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || defaultConfig.level,
    enableApi: import.meta.env.VITE_LOG_API !== 'false',
    enableUi: import.meta.env.VITE_LOG_UI !== 'false',
    enableLdap: import.meta.env.VITE_LOG_LDAP !== 'false',
    enableDb: import.meta.env.VITE_LOG_DB !== 'false',
  };
};

// Current logger configuration
const config = getLoggerConfig();

// Log level hierarchy for filtering
const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

// Check if a log should be shown based on its level
const shouldLog = (level: LogLevel): boolean => {
  const configLevel = logLevels[config.level];
  const messageLevel = logLevels[level];
  return messageLevel >= configLevel;
};

// Format timestamp for logs
const getTimestamp = (): string => {
  return new Date().toISOString();
};

// Helper to sanitize sensitive data from logs
const sanitizeForLog = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(obj));
  
  // List of fields that should be redacted
  const sensitiveFields = ['password', 'pwd', 'secret', 'token', 'key', 'unicodePwd'];
  
  // Recursively sanitize the object
  const sanitizeObj = (obj: any): void => {
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

// Logger functions for different components
export const logger = {
  // API related logs
  api: {
    debug: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('debug')) {
        console.debug(`[${getTimestamp()}] [API] [DEBUG] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    info: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('info')) {
        console.info(`[${getTimestamp()}] [API] [INFO] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('warn')) {
        console.warn(`[${getTimestamp()}] [API] [WARN] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    error: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('error')) {
        console.error(`[${getTimestamp()}] [API] [ERROR] ${message}`, ...args.map(sanitizeForLog));
      }
    },
  },

  // UI component logs
  ui: {
    debug: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('debug')) {
        console.debug(`[${getTimestamp()}] [${component}] [DEBUG] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    info: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('info')) {
        console.info(`[${getTimestamp()}] [${component}] [INFO] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    warn: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('warn')) {
        console.warn(`[${getTimestamp()}] [${component}] [WARN] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    error: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('error')) {
        console.error(`[${getTimestamp()}] [${component}] [ERROR] ${message}`, ...args.map(sanitizeForLog));
      }
    },
  },
  
  // LDAP/Active Directory specific logs (client-side)
  ldap: {
    debug: (message: string, ...args: any[]) => {
      if (config.enableLdap && shouldLog('debug')) {
        console.debug(`[${getTimestamp()}] [LDAP] [DEBUG] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    info: (message: string, ...args: any[]) => {
      if (config.enableLdap && shouldLog('info')) {
        console.info(`[${getTimestamp()}] [LDAP] [INFO] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (config.enableLdap && shouldLog('warn')) {
        console.warn(`[${getTimestamp()}] [LDAP] [WARN] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    error: (message: string, ...args: any[]) => {
      if (config.enableLdap && shouldLog('error')) {
        console.error(`[${getTimestamp()}] [LDAP] [ERROR] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    operation: (operation: string, details: any = null) => {
      if (config.enableLdap && shouldLog('debug')) {
        console.debug(`[${getTimestamp()}] [LDAP] [OPERATION] ${operation}`);
        if (details) {
          console.debug(`[${getTimestamp()}] [LDAP] [DETAILS]`, sanitizeForLog(details));
        }
      }
    },
    // Add enhanced error reporting for LDAP operations
    errorDetail: (err: any) => {
      if (config.enableLdap && shouldLog('error')) {
        console.error(`[${getTimestamp()}] [LDAP] [ERROR-DETAIL] ${err.name || 'Error'}: ${err.message}`);
        
        // Interpret LDAP error codes if available
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
          
          console.error(`[${getTimestamp()}] [LDAP] [ERROR-CODE] Code ${err.code}: ${interpretation}`);
        }
      }
    }
  },

  // Database related logs
  db: {
    debug: (message: string, ...args: any[]) => {
      if (config.enableDb && shouldLog('debug')) {
        console.debug(`[${getTimestamp()}] [DATABASE] [DEBUG] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    info: (message: string, ...args: any[]) => {
      if (config.enableDb && shouldLog('info')) {
        console.info(`[${getTimestamp()}] [DATABASE] [INFO] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (config.enableDb && shouldLog('warn')) {
        console.warn(`[${getTimestamp()}] [DATABASE] [WARN] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    error: (message: string, ...args: any[]) => {
      if (config.enableDb && shouldLog('error')) {
        console.error(`[${getTimestamp()}] [DATABASE] [ERROR] ${message}`, ...args.map(sanitizeForLog));
      }
    },
    // Add SQL error details logging
    sqlError: (err: any) => {
      if (config.enableDb && shouldLog('error')) {
        console.error(`[${getTimestamp()}] [DATABASE] [SQL-ERROR] ${err.message}`);
        if (err.code) {
          console.error(`[${getTimestamp()}] [DATABASE] [SQL-CODE] ${err.code}`);
        }
        if (err.originalError?.info) {
          console.error(`[${getTimestamp()}] [DATABASE] [SQL-DETAILS] Number: ${err.originalError.info.number}, State: ${err.originalError.info.state}`);
          console.error(`[${getTimestamp()}] [DATABASE] [SQL-MESSAGE] ${err.originalError.info.message}`);
        }
      }
    }
  }
};

export default logger;
