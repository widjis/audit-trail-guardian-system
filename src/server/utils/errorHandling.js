/**
 * Enhanced error handling utilities for server routes
 * Provides consistent error responses and logging
 */

import logger from './logger.js';

// Custom error classes
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

export class ExternalServiceError extends Error {
  constructor(service, message = 'External service unavailable', originalError = null) {
    super(`${service}: ${message}`);
    this.name = 'ExternalServiceError';
    this.service = service;
    this.statusCode = 502;
    this.originalError = originalError;
  }
}

// Result pattern for better error handling
export class Result {
  constructor(success, data = null, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  static ok(data = null) {
    return new Result(true, data, null);
  }

  static error(error) {
    return new Result(false, null, error);
  }

  isOk() {
    return this.success;
  }

  isError() {
    return !this.success;
  }

  unwrap() {
    if (this.isError()) {
      throw this.error;
    }
    return this.data;
  }

  unwrapOr(defaultValue) {
    return this.isOk() ? this.data : defaultValue;
  }
}

// Async wrapper for better error handling
export const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// Enhanced error middleware
export const enhancedErrorHandler = (err, req, res, next) => {
  // Log the error with context
  const errorContext = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  };

  logger.api.error('Request error:', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    },
    context: errorContext
  });

  // Determine status code
  let statusCode = err.statusCode || 500;
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
  } else if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 409; // Duplicate key error
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      type: err.name || 'Error',
      message: err.message || 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  };

  // Add field information for validation errors
  if (err.field) {
    errorResponse.error.field = err.field;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.originalError?.message;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Validation middleware factory
export const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[property];
      const validatedData = schema.parse(data);
      req[property] = validatedData;
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        next(new ValidationError(`Validation failed: ${errorMessages.join(', ')}`));
      } else {
        next(error);
      }
    }
  };
};

// Database operation wrapper
export const withDatabase = async (operation, errorMessage = 'Database operation failed') => {
  try {
    const result = await operation();
    return Result.ok(result);
  } catch (error) {
    logger.api.error(`Database error: ${errorMessage}`, error);
    return Result.error(new DatabaseError(errorMessage, error));
  }
};

// External service operation wrapper
export const withExternalService = async (serviceName, operation, errorMessage = 'Service unavailable') => {
  try {
    const result = await operation();
    return Result.ok(result);
  } catch (error) {
    logger.api.error(`External service error (${serviceName}): ${errorMessage}`, error);
    return Result.error(new ExternalServiceError(serviceName, errorMessage, error));
  }
};

// Response helpers
export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: {
      type: error.name || 'Error',
      message: error.message || 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString()
  });
};

export const sendValidationError = (res, errors) => {
  res.status(400).json({
    success: false,
    error: {
      type: 'ValidationError',
      message: 'Validation failed',
      details: errors
    },
    timestamp: new Date().toISOString()
  });
};