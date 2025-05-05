
/**
 * Centralized logger utility for frontend
 * Controls logging based on environment variables
 */

// Log levels in order of verbosity
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enableApi: boolean;
  enableUi: boolean;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  level: 'info', // Default log level
  enableApi: true, // API logs enabled by default
  enableUi: true, // UI logs enabled by default
};

// Get config from environment variables or use defaults
const getLoggerConfig = (): LoggerConfig => {
  // Read from env variables if available
  return {
    level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || defaultConfig.level,
    enableApi: import.meta.env.VITE_LOG_API !== 'false',
    enableUi: import.meta.env.VITE_LOG_UI !== 'false',
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

// Logger functions for different components
export const logger = {
  // API related logs
  api: {
    debug: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('debug')) {
        console.debug(`[API] ${message}`, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('info')) {
        console.info(`[API] ${message}`, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('warn')) {
        console.warn(`[API] ${message}`, ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (config.enableApi && shouldLog('error')) {
        console.error(`[API] ${message}`, ...args);
      }
    },
  },

  // UI component logs
  ui: {
    debug: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('debug')) {
        console.debug(`[${component}] ${message}`, ...args);
      }
    },
    info: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('info')) {
        console.info(`[${component}] ${message}`, ...args);
      }
    },
    warn: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('warn')) {
        console.warn(`[${component}] ${message}`, ...args);
      }
    },
    error: (component: string, message: string, ...args: any[]) => {
      if (config.enableUi && shouldLog('error')) {
        console.error(`[${component}] ${message}`, ...args);
      }
    },
  },
};

export default logger;
