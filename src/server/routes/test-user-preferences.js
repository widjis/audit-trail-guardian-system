import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../utils/dbConnection.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Test route to save user preferences without authentication
 * This is for testing the sidebar functionality
 * POST /api/test-user-preferences
 */
router.post('/', async (req, res) => {
  try {
    // Use a test user ID for demonstration
    const userId = 'test-user-123';
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences data'
      });
    }

    logger.api.info(`Saving test preferences for user: ${userId}`, preferences);

    // Save each preference
    for (const [key, value] of Object.entries(preferences)) {
      const preferenceValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Check if preference exists
      const existingResult = await executeQuery(
        'SELECT id FROM user_preferences WHERE user_id = ? AND preference_key = ?',
        [userId, key]
      );

      if (existingResult.length > 0) {
        // Update existing preference
        await executeQuery(
          'UPDATE user_preferences SET preference_value = ?, updated_at = GETDATE() WHERE user_id = ? AND preference_key = ?',
          [preferenceValue, userId, key]
        );
      } else {
        // Insert new preference
        await executeQuery(
          'INSERT INTO user_preferences (id, user_id, preference_key, preference_value) VALUES (?, ?, ?, ?)',
          [uuidv4(), userId, key, preferenceValue]
        );
      }
    }
      
    res.json({
      success: true,
      message: 'Test preferences saved successfully',
      preferences,
      userId
    });
  } catch (error) {
    logger.api.error('Error saving test user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save test user preferences',
      error: error.message
    });
  }
});

/**
 * Test route to get user preferences without authentication
 * GET /api/test-user-preferences
 */
router.get('/', async (req, res) => {
  try {
    const userId = 'test-user-123';
    logger.api.info(`Fetching test preferences for user: ${userId}`);

    const result = await executeQuery(
      'SELECT preference_key, preference_value FROM user_preferences WHERE user_id = ?',
      [userId]
    );

    // Convert array of key-value pairs to object
    const preferences = {};
    result.forEach(row => {
      try {
        // Try to parse JSON, fallback to string value
        preferences[row.preference_key] = JSON.parse(row.preference_value);
      } catch (e) {
        preferences[row.preference_key] = row.preference_value;
      }
    });

    res.json({
      success: true,
      preferences,
      userId
    });
  } catch (error) {
    logger.api.error('Error fetching test user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test user preferences',
      error: error.message
    });
  }
});

export default router;