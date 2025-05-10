// src/server/middleware/authMiddleware.js
import logger from '../utils/logger.js';

export const extractUser = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove "Bearer " prefix
      
      // Decode the token (it's base64 encoded as per the auth.js implementation)
      const decodedToken = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Add user information to the request object
      req.user = {
        id: decodedToken.userId,
        username: decodedToken.username,
        role: decodedToken.role
      };
      
      logger.api.debug(`User extracted from token: ${decodedToken.username}`);
    }
  } catch (error) {
    logger.api.error('Error extracting user from token:', error);
    // Continue even if token is invalid - protected routes should check for req.user
  }
  
  next();
}
