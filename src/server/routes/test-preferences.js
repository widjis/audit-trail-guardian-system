import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Test POST route for user preferences
 * POST /api/test-preferences
 */
router.post('/', async (req, res) => {
  try {
    logger.api.info('Test POST route hit successfully');
    res.json({
      success: true,
      message: 'Test POST route working',
      body: req.body
    });
  } catch (error) {
    logger.api.error('Error in test POST route:', error);
    res.status(500).json({
      success: false,
      message: 'Test POST route failed',
      error: error.message
    });
  }
});

/**
 * Test GET route for user preferences
 * GET /api/test-preferences
 */
router.get('/', async (req, res) => {
  try {
    logger.api.info('Test GET route hit successfully');
    res.json({
      success: true,
      message: 'Test GET route working'
    });
  } catch (error) {
    logger.api.error('Error in test GET route:', error);
    res.status(500).json({
      success: false,
      message: 'Test GET route failed',
      error: error.message
    });
  }
});

export default router;