
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper function to read users
const getUsers = () => {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
};

// Helper function to write users
const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
};

// Get all support accounts
router.get('/support', (req, res) => {
  try {
    const users = getUsers();
    const supportUsers = users.filter(user => user.role === 'support' || user.role === 'admin');
    
    // Don't send passwords in response
    const sanitizedUsers = supportUsers.map(({ password, ...user }) => user);
    
    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve support accounts' });
  }
});

// Create a new account
router.post('/', (req, res) => {
  try {
    const { username, password, role = 'support' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const users = getUsers();
    const existingUser = users.find(u => u.username === username);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const newUser = {
      id: generateId(),
      username,
      password,
      role
    };
    
    users.push(newUser);
    saveUsers(users);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Update an existing account
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if new username is already taken by another user
    const existingUser = users.find(u => u.username === username && u.id !== id);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Update user, preserving password and role
    users[userIndex] = {
      ...users[userIndex],
      username
    };
    
    saveUsers(users);
    
    const { password: _, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete an account
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const users = getUsers();
    const initialLength = users.length;
    
    // Filter out the user to delete
    const updatedUsers = users.filter(u => u.id !== id);
    
    if (updatedUsers.length === initialLength) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    saveUsers(updatedUsers);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Reset password
router.post('/:id/reset-password', (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update password
    users[userIndex] = {
      ...users[userIndex],
      password
    };
    
    saveUsers(users);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
