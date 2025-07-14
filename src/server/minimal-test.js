import express from 'express';

const app = express();
const port = 3002;

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal test works' });
});

app.post('/api/user-preferences', (req, res) => {
  res.json({ success: true, message: 'User preferences saved', data: req.body });
});

app.listen(port, () => {
  console.log(`Minimal test server running on port ${port}`);
});