
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from '../utils/dbConnection.js';
import { initializeSchema } from '../utils/schemaInit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users.json');

const router = express.Router();

// Initialize schema on module load
initializeSchema().catch(err => {
  console.error('Failed to initialize schema:', err);
});

// Fallback method to read users from JSON if database fails
const getUsersFromFile = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Fallback method to write users to JSON if database fails
const writeUsersToFile = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    return false;
  }
};

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await executeQuery('SELECT id, username, role FROM users');
    res.json(users);
  } catch (error) {
    console.error('Failed to get users from database:', error);
    
    // Fallback to file
    const users = getUsersFromFile();
    res.json(users);
  }
});

// Get all support accounts
router.get('/support', async (req, res) => {
  try {
    const query = "SELECT id, username, role FROM users WHERE role = 'support'";
    const supportUsers = await executeQuery(query);
    res.json(supportUsers);
  } catch (error) {
    console.error('Failed to get support users from database:', error);
    
    // Fallback to file
    const users = getUsersFromFile();
    const supportUsers = users.filter(user => user.role === 'support');
    res.json(supportUsers);
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
    
    // Insert user into database
    const query = 'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)';
    await executeQuery(query, [user.id, user.username, user.password, user.role]);
    
    // Return the created user without password
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Failed to create user in database:', error);
    
    // Fallback to file
    try {
      let users = getUsersFromFile();
      
      // Check if username already exists
      if (users.some(u => u.username === req.body.username)) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      const user = {
        id: req.body.id || Math.random().toString(36).substring(2, 15),
        username: req.body.username,
        password: req.body.password,
        role: req.body.role || 'support'
      };
      
      users.push(user);
      writeUsersToFile(users);
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (fallbackError) {
      console.error('File fallback also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to create user' });
    }
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
    console.error('Failed to update user in database:', error);
    
    // Fallback to file
    try {
      let users = getUsersFromFile();
      const index = users.findIndex(u => u.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if new username conflicts
      if (req.body.username) {
        const usernameExists = users.some(u => u.username === req.body.username && u.id !== req.params.id);
        if (usernameExists) {
          return res.status(409).json({ error: 'Username already exists' });
        }
      }
      
      users[index] = { 
        ...users[index],
        username: req.body.username || users[index].username,
        role: req.body.role || users[index].role
      };
      
      writeUsersToFile(users);
      
      const { password, ...userWithoutPassword } = users[index];
      res.json(userWithoutPassword);
    } catch (fallbackError) {
      console.error('File fallback also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to update user' });
    }
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
    console.error('Failed to delete user from database:', error);
    
    // Fallback to file
    try {
      let users = getUsersFromFile();
      const index = users.findIndex(u => u.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Don't allow deleting the admin account
      if (users[index].role === 'admin' && users[index].id === '1') {
        return res.status(403).json({ error: 'Cannot delete the admin account' });
      }
      
      users.splice(index, 1);
      writeUsersToFile(users);
      
      res.status(204).send();
    } catch (fallbackError) {
      console.error('File fallback also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to delete user' });
    }
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
    
    // Update password in database
    await executeQuery('UPDATE users SET password = ? WHERE id = ?', [password, id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to reset password in database:', error);
    
    // Fallback to file
    try {
      let users = getUsersFromFile();
      const index = users.findIndex(u => u.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      users[index].password = req.body.password;
      writeUsersToFile(users);
      
      res.json({ success: true });
    } catch (fallbackError) {
      console.error('File fallback also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
});

export default router;
