
import express from 'express';
import { executeQuery } from '../utils/dbConnection.js';
import { initializeSchema } from '../utils/schemaInit.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

const router = express.Router();
const SALT_ROUNDS = 10;

// Initialize schema on module load
initializeSchema().catch(err => {
  logger.db.error('Failed to initialize schema:', err);
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await executeQuery('SELECT id, username, role FROM users');
    res.json(users);
  } catch (error) {
    logger.api.error('Failed to get users from database:', error);
    res.status(500).json({ error: 'Database error: Failed to retrieve users' });
  }
});

// Get all support accounts
router.get('/support', async (req, res) => {
  try {
    const query = "SELECT id, username, role FROM users WHERE role = 'support'";
    const supportUsers = await executeQuery(query);
    res.json(supportUsers);
  } catch (error) {
    logger.api.error('Failed to get support users from database:', error);
    res.status(500).json({ error: 'Database error: Failed to retrieve support users' });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const user = req.body;
    
    // Generate a unique ID if not provided
    if (!user.id) {
      user.id = Math.random().toString(36).substring(2, 15);
    }
    
    // Ensure role is set
    if (!user.role) {
      user.role = 'support';
    }
    
    // Check if username already exists
    const existingUsers = await executeQuery('SELECT id FROM users WHERE username = ?', [user.username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    logger.api.info('Creating new user in database:', { id: user.id, username: user.username, role: user.role });
    
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    logger.api.debug('Password hashed successfully');
    
    // Insert user into database with hashed password
    const query = 'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)';
    await executeQuery(query, [user.id, user.username, hashedPassword, user.role]);
    
    logger.api.info('User successfully created in database');
    
    // Return the created user without password
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    logger.api.error('Failed to create user in database:', error);
    res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

// Update an existing user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role } = req.body;
    
    // Check if user exists
    const existingUsers = await executeQuery('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if new username conflicts with another user
    if (username) {
      const usernameCheck = await executeQuery('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
      if (usernameCheck.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
    }
    
    // Update user in database
    const query = 'UPDATE users SET username = ?, role = ? WHERE id = ?';
    await executeQuery(query, [username, role, id]);
    
    res.json({ id, username, role });
  } catch (error) {
    logger.api.error('Failed to update user in database:', error);
    res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists and is not the admin account
    const existingUsers = await executeQuery('SELECT id, role FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow deleting the admin account
    const user = existingUsers[0];
    if (user.role === 'admin' && user.id === '1') {
      return res.status(403).json({ error: 'Cannot delete the admin account' });
    }
    
    // Delete user from database
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);
    
    res.status(204).send();
  } catch (error) {
    logger.api.error('Failed to delete user from database:', error);
    res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

// Reset password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // Check if user exists
    const existingUsers = await executeQuery('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    logger.api.debug('Password reset: new password hashed successfully');
    
    // Update password in database
    await executeQuery('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    
    res.json({ success: true });
  } catch (error) {
    logger.api.error('Failed to reset password in database:', error);
    res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

export default router;
