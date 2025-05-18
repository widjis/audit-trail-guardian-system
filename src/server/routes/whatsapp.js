
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Data storage paths
const DATA_DIR = path.join(__dirname, '../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Get WhatsApp settings
const getWhatsAppSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return settings.whatsappSettings || {};
    }
    return {};
  } catch (err) {
    logger.api.error('Error reading WhatsApp settings:', err);
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
    const settings = getWhatsAppSettings();
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

export default router;
