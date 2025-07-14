import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../utils/dbConnection.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Get all preferences for the current user
 * GET /api/user-preferences
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.api.info(`Fetching preferences for user: ${userId}`);

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
      preferences
    });
  } catch (error) {
    logger.api.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user preferences',
      error: error.message
    });
  }
});

/**
 * Save/update multiple preferences for the current user
 * POST /api/user-preferences
 * PUT /api/user-preferences
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences data'
      });
    }

    logger.api.info(`Saving preferences for user: ${userId}`, preferences);

    // Save each preference
    for (const [key, value] of Object.entries(preferences)) {
      const preferenceValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      logger.api.info(`Processing preference: ${key} = ${preferenceValue}`);
      
      // Check if preference exists
      const existingResult = await executeQuery(
        'SELECT id FROM user_preferences WHERE user_id = ? AND preference_key = ?',
        [userId, key]
      );

      logger.api.info(`Existing preference check result:`, existingResult);

      if (existingResult.length > 0) {
        // Update existing preference
        logger.api.info(`Updating existing preference: ${key}`);
        const updateResult = await executeQuery(
          'UPDATE user_preferences SET preference_value = ?, updated_at = GETDATE() WHERE user_id = ? AND preference_key = ?',
          [preferenceValue, userId, key]
        );
        logger.api.info(`Update result:`, updateResult);
      } else {
        // Insert new preference
        const newId = uuidv4();
        logger.api.info(`Inserting new preference: ${key} with ID: ${newId}`);
        const insertResult = await executeQuery(
          'INSERT INTO user_preferences (id, user_id, preference_key, preference_value) VALUES (?, ?, ?, ?)',
          [newId, userId, key, preferenceValue]
        );
        logger.api.info(`Insert result:`, insertResult);
      }
    }
      
    res.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences
    });
  } catch (error) {
    logger.api.error('Error saving user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save user preferences',
      error: error.message
    });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences data'
      });
    }

    logger.api.info(`Saving preferences for user: ${userId}`, preferences);

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
      message: 'Preferences saved successfully',
      preferences
    });
  } catch (error) {
    logger.api.error('Error saving user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save user preferences',
      error: error.message
    });
  }
});

/**
 * Delete a specific preference for the current user
 * DELETE /api/user-preferences/:key
 */
router.delete('/:key', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { key } = req.params;

    logger.api.info(`Deleting preference '${key}' for user: ${userId}`);

    const result = await executeQuery(
      'DELETE FROM user_preferences WHERE user_id = ? AND preference_key = ?',
      [userId, key]
    );

    res.json({
      success: true,
      message: `Preference '${key}' deleted successfully`,
      deleted: result.affectedRows > 0
    });
  } catch (error) {
    logger.api.error('Error deleting user preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user preference',
      error: error.message
    });
  }
});

/**
 * Clear all preferences for the current user
 * DELETE /api/user-preferences
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.api.info(`Clearing all preferences for user: ${userId}`);

    const result = await executeQuery(
      'DELETE FROM user_preferences WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'All preferences cleared successfully',
      deleted: result.affectedRows
    });
  } catch (error) {
    logger.api.error('Error clearing user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear user preferences',
      error: error.message
    });
  }
});

export default router;