import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

// Rate limiting configurations
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Specific rate limiters for different endpoints
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const apiLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const uploadLimiter = createRateLimiter(60 * 60 * 1000, 10); // 10 uploads per hour

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input validation schemas
export const validationSchemas = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  phone: body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  id: body('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  text: (field, minLength = 1, maxLength = 1000) => 
    body(field)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
      .escape(),
};

// Validation middleware
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// File upload security
export const fileUploadSecurity = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and spreadsheets are allowed.'), false);
    }
  }
};

// SQL injection prevention patterns
export const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(;|\-\-|\/\*|\*\/)/,
  /(\b(OR|AND)\b.*=.*)/i
];

export const checkSqlInjection = (input) => {
  if (typeof input !== 'string') return false;
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
};

// XSS prevention
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// CSRF token generation
export const generateCSRFToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

// Security middleware factory
export const createSecurityMiddleware = (options = {}) => {
  return (req, res, next) => {
    // Check for SQL injection in query parameters and body
    const checkParams = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string' && checkSqlInjection(obj[key])) {
          return res.status(400).json({
            error: 'Invalid input detected',
            message: 'Request contains potentially harmful content'
          });
        }
      }
    };
    
    if (req.query) checkParams(req.query);
    if (req.body) checkParams(req.body);
    
    // Add security headers
    res.setHeader('X-Request-ID', req.headers['x-request-id'] || require('crypto').randomUUID());
    
    next();
  };
};

// Environment-specific security configurations
export const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    cors: {
      origin: isProduction 
        ? process.env.FRONTEND_URL?.split(',') || false
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'],
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
    },
    session: {
      secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? 'strict' : 'lax'
      }
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 100 : 1000, // More lenient in development
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    }
  };
};

export default {
  createRateLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  helmetConfig,
  validationSchemas,
  validateRequest,
  fileUploadSecurity,
  checkSqlInjection,
  sanitizeInput,
  generateCSRFToken,
  createSecurityMiddleware,
  getSecurityConfig
};