
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to get current user and attach to request
export const getCurrentUser = (req, res, next) => {
  try {
    // If user is already attached (from auth middleware), use that
    if (req.user) {
      return next();
    }

    // For development/testing purposes, you can add default user logic here
    // This should be removed in production and rely on proper authentication
    if (process.env.NODE_ENV === 'development') {
      req.user = {
        id: 'dev-user',
        username: 'developer',
        email: 'dev@example.com'
      };
    }

    next();
  } catch (error) {
    console.error('Error in getCurrentUser middleware:', error);
    next();
  }
};
