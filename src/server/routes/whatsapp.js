
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import SystemConfigService from '../services/system-config-service.js';
import { getDbPool } from '../utils/dbConnection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get WhatsApp settings endpoint
router.get('/settings', async (req, res) => {
  try {
    const settings = await getWhatsAppSettings();
    logger.api.info('WhatsApp settings retrieved successfully');
    return res.json(settings);
  } catch (error) {
    logger.api.error('Error retrieving WhatsApp settings:', error);
    return res.status(500).json({
      error: 'Failed to retrieve WhatsApp settings',
      details: error.message
    });
  }
});

// Data storage paths (fallback)
const DATA_DIR = path.join(__dirname, '../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Get WhatsApp settings from database or fallback to file
const getWhatsAppSettings = async () => {
  try {
    // Try to get from database first
    const dbPool = await getDbPool();
    const systemConfigService = new SystemConfigService(dbPool);
    const dbConfig = await systemConfigService.getWhatsAppConfig();
    
    if (dbConfig) {
      logger.api.info('WhatsApp settings loaded from database');
      return dbConfig;
    }
    
    // Fallback to file-based settings
    logger.api.warn('Database config not found, falling back to file-based settings');
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return settings.whatsappSettings || {};
    }
    return {};
  } catch (err) {
    logger.api.error('Error reading WhatsApp settings:', err);
    // Fallback to file-based settings on error
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        return settings.whatsappSettings || {};
      }
    } catch (fileErr) {
      logger.api.error('Error reading file-based WhatsApp settings:', fileErr);
    }
    return {};
  }
};

// Proxy endpoint for sending WhatsApp messages
router.post('/send', async (req, res) => {
  try {
    const { number, message } = req.body;
    
    if (!number || !message) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        details: 'Both number and message are required'
      });
    }

    // Get WhatsApp API URL from settings
    const settings = await getWhatsAppSettings();
    if (!settings.apiUrl) {
      return res.status(400).json({ 
        error: 'WhatsApp API not configured', 
        details: 'No API URL found in settings'
      });
    }

    // Format the full URL
    let apiUrl = settings.apiUrl;
    if (!apiUrl.endsWith('/')) {
      apiUrl += '/';
    }
    apiUrl += 'send-message';

    logger.api.info(`Proxying WhatsApp message to ${apiUrl} for number: ${number}`);
    
    // Make the request to the WhatsApp API
    const response = await axios.post(apiUrl, {
      number,
      message
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Bypass SSL verification only if necessary (for self-signed certs)
      // httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    // Return the response from the WhatsApp API
    logger.api.info('WhatsApp API response:', response.data);
    return res.status(response.status).json(response.data);
  } catch (error) {
    logger.api.error('Error proxying WhatsApp message:', error);
    
    // Structured error response
    const status = error.response?.status || 500;
    const errorResponse = {
      error: 'Failed to send WhatsApp message',
      details: error.message,
      status
    };
    
    if (error.response?.data) {
      errorResponse.apiResponse = error.response.data;
    }
    
    return res.status(status).json(errorResponse);
  }
});

// Proxy endpoint for sending WhatsApp group messages
router.post('/send-group', async (req, res) => {
  try {
    const { id, name, message, mention, document, image } = req.body;
    
    // Validate required parameters
    if (!id && !name) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        details: 'Either group id or name is required'
      });
    }

    // Get WhatsApp API URL from settings
    const settings = await getWhatsAppSettings();
    if (!settings.apiUrl) {
      return res.status(400).json({ 
        error: 'WhatsApp API not configured', 
        details: 'No API URL found in settings'
      });
    }

    // Format the full URL
    let apiUrl = settings.apiUrl;
    if (!apiUrl.endsWith('/')) {
      apiUrl += '/';
    }
    apiUrl += 'send-group-message';

    logger.api.info(`Proxying WhatsApp group message to ${apiUrl} for group: ${id || name}`);
    
    // Prepare the request body
    const requestBody = {
      id,
      name,
      message,
      mention
    };

    // Remove undefined fields
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === undefined) {
        delete requestBody[key];
      }
    });
    
    // Make the request to the WhatsApp API
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Bypass SSL verification only if necessary (for self-signed certs)
      // httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    // Return the response from the WhatsApp API
    logger.api.info('WhatsApp group API response:', response.data);
    return res.status(response.status).json(response.data);
  } catch (error) {
    logger.api.error('Error proxying WhatsApp group message:', error);
    
    // Structured error response
    const status = error.response?.status || 500;
    const errorResponse = {
      error: 'Failed to send WhatsApp group message',
      details: error.message,
      status
    };
    
    if (error.response?.data) {
      errorResponse.apiResponse = error.response.data;
    }
    
    return res.status(status).json(errorResponse);
  }
});

export default router;
