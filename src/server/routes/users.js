
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
    const users = await executeQuery('SELECT id, username, role, approved FROM users');
    res.json(users);
  } catch (error) {
    logger.api.error('Failed to get users from database:', error);
    res.status(500).json({ error: 'Database error: Failed to retrieve users' });
  }
});

// Get all support accounts
router.get('/support', async (req, res) => {
  try {
    const query = "SELECT id, username, role, approved FROM users WHERE role = 'support'";
    const supportUsers = await executeQuery(query);
    res.json(supportUsers);
  } catch (error) {
    logger.api.error('Failed to get support users from database:', error);
    res.status(500).json({ error: 'Database error: Failed to retrieve support users' });
  }
});

// Get pending approval accounts
router.get('/pending', async (req, res) => {
  try {
    const query = "SELECT id, username, role FROM users WHERE approved = 0 AND role = 'support'";
    const pendingUsers = await executeQuery(query);
    res.json(pendingUsers);
  } catch (error) {
    logger.api.error('Failed to get pending users from database:', error);
    res.status(500).json({ error: 'Database error: Failed to retrieve pending users' });
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
    
    // Set approved to 1 for admin-created accounts
    const approved = user.approved !== undefined ? user.approved : 1;
    
    // Insert user into database with hashed password
    const query = 'INSERT INTO users (id, username, password, role, approved) VALUES (?, ?, ?, ?, ?)';
    await executeQuery(query, [user.id, user.username, hashedPassword, user.role, approved]);
    
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
    const { username, role, approved } = req.body;
    
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
    let query = 'UPDATE users SET username = ?, role = ?';
    let params = [username, role];
    
    // Include approved status in update if provided
    if (approved !== undefined) {
      query += ', approved = ?';
      params.push(approved ? 1 : 0);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await executeQuery(query, params);
    
    res.json({ id, username, role, approved: approved !== undefined ? approved : undefined });
  } catch (error) {
    logger.api.error('Failed to update user in database:', error);
    res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

// Approve a user
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUsers = await executeQuery('SELECT id, username FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update approval status
    await executeQuery('UPDATE users SET approved = 1 WHERE id = ?', [id]);
    
    const username = existingUsers[0].username;
    logger.api.info(`User ${username} has been approved`);
    
    res.json({ success: true, message: `User ${username} has been approved` });
  } catch (error) {
    logger.api.error('Failed to approve user:', error);
    res.status(500).json({ error: `Database error: ${error.message}` });
  }
});

// Disapprove a user
router.post('/:id/disapprove', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUsers = await executeQuery('SELECT id, username FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update approval status
    await executeQuery('UPDATE users SET approved = 0 WHERE id = ?', [id]);
    
    const username = existingUsers[0].username;
    logger.api.info(`User ${username} has been disapproved`);
    
    res.json({ success: true, message: `User ${username} has been disapproved` });
  } catch (error) {
    logger.api.error('Failed to disapprove user:', error);
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
