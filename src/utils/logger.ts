
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
}

// Default configuration
const defaultConfig: LoggerConfig = {
  level: 'info',     // Default log level
  enableApi: true,   // API logs enabled by default
  enableUi: true,    // UI logs enabled by default
  enableLdap: true,  // LDAP logs enabled by default
};

// Get config from environment variables or use defaults
const getLoggerConfig = (): LoggerConfig => {
  // Read from env variables if available
  return {
    level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || defaultConfig.level,
    enableApi: import.meta.env.VITE_LOG_API !== 'false',
    enableUi: import.meta.env.VITE_LOG_UI !== 'false',
    enableLdap: import.meta.env.VITE_LOG_LDAP !== 'false',
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
  },
};

export default logger;
