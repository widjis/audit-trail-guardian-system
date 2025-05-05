
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

// Simulate JWT token
const generateToken = (userId, username, role) => {
  return Buffer.from(JSON.stringify({ userId, username, role, exp: Date.now() + 3600000 })).toString('base64');
};

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
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
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Register route
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const existingUser = users.find(u => u.username === username);
  
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  const newUser = {
    id: generateId(),
    username,
    password,
    role: 'user'
  };
  
  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  
  const token = generateToken(newUser.id, newUser.username, newUser.role);
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role
    }
  });
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
