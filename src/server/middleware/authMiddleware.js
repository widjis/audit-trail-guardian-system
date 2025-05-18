
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

// Set up dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const ENV_FILE_PATH = path.join(__dirname, '../../../.env');
if (fs.existsSync(ENV_FILE_PATH)) {
  dotenv.config({ path: ENV_FILE_PATH });
}

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

/**
 * Extract user information from JWT token and attach to req object
 * This middleware does NOT reject unauthorized requests, just attaches user info if available
 */
export const extractUser = (req, res, next) => {
  try {
    // Get token from request header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Try JWT verification first
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach user info to request object
        req.user = {
          id: decoded.userId,
          username: decoded.username,
          role: decoded.role
        };
        
        logger.api.debug(`Authenticated user via JWT: ${req.user.username} with role ${req.user.role}`);
      } catch (jwtError) {
        logger.api.debug('JWT verification failed, trying base64 decode:', jwtError.message);
        
        // Fall back to base64 decode for compatibility with old tokens
        try {
          const decodedToken = JSON.parse(Buffer.from(token, 'base64').toString());
          
          // Add user information to the request object
          req.user = {
            id: decodedToken.userId,
            username: decodedToken.username,
            role: decodedToken.role
          };
          
          logger.api.debug(`Authenticated user via base64: ${req.user.username} with role ${req.user.role}`);
        } catch (base64Error) {
          logger.api.warn('Invalid or malformed token:', base64Error.message);
          req.user = null;
        }
      }
    } else {
      logger.api.debug('No authorization token provided');
      req.user = null;
    }
    
    next();
  } catch (error) {
    logger.api.error('Error in extractUser middleware:', error);
    // Don't reject, but log the error
    req.user = null;
    next();
  }
};

/**
 * Require authenticated user to access route
 */
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  next();
};

/**
 * Require admin role to access route
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  next();
};
