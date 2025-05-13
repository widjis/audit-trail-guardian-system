
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Simulate JWT token
const generateToken = (userId, username, role) => {
  return Buffer.from(JSON.stringify({ userId, username, role, exp: Date.now() + 3600000 })).toString('base64');
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get user from database
    const users = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      logger.api.warn(`Login attempt for non-existent user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      // Check if user is approved
      if (!user.approved && user.role !== 'admin') {
        logger.api.warn(`Login attempt by unapproved user: ${username}`);
        return res.status(403).json({ error: 'Your account is pending approval by an admin' });
      }
      
      logger.api.info(`User logged in successfully: ${username}`);
      const token = generateToken(user.id, user.username, user.role);
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } else {
      logger.api.warn(`Failed login attempt for user: ${username}`);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    logger.api.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username already exists
    const existingUsers = await executeQuery('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const userId = generateId();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Changed role from 'user' to 'support' for new registrations
    await executeQuery('INSERT INTO users (id, username, password, role, approved) VALUES (?, ?, ?, ?, ?)', 
      [userId, username, hashedPassword, 'support', 0]);
    
    const token = generateToken(userId, username, 'support');
    res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        role: 'support'
      }
    });
  } catch (error) {
    logger.api.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token route
router.post('/verify-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ valid: false });
  }
  
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const valid = decoded.exp > Date.now();
    res.json({ valid });
  } catch (error) {
    res.json({ valid: false });
  }
});

export default router;
