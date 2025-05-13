
import axios from 'axios';
import logger from '@/utils/logger';

// Get API base URL from environment variables, with fallback for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create base API client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add logging for outgoing requests
  logger.api.info(`${config.method?.toUpperCase()} ${config.url}`);
  if (config.data) {
    logger.api.debug('Request data:', JSON.stringify(config.data));
  }
  logger.api.debug('Request headers:', JSON.stringify(config.headers));
  
  return config;
});

// Add response and error handler
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses
    logger.api.info(`Response from ${response.config.url}: ${response.status} ${response.statusText}`);
    logger.api.debug('Response data:', JSON.stringify(response.data));
    return response;
  },
  (error) => {
    // Detailed error logging
    if (error.response) {
      // Handle specific error responses
      const { status, data, config } = error.response;
      
      logger.api.error(`Error ${status} from ${config.url}:`, data);
      logger.api.error('Request that failed:', config.method, config.url);
      logger.api.debug('Request data that failed:', config.data);
      
      if (status === 401) {
        // Unauthorized - redirect to login
        logger.api.error('Unauthorized access, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else if (status === 503) {
        // Service unavailable - likely database connection issue
        logger.api.error('Database connection error:', data.error || 'Service unavailable');
      }
      
      // Convert the error message from the server
      const message = data.error || 'An unexpected error occurred';
      return Promise.reject(new Error(message));
    }
    
    // Handle network errors
    if (error.request && !error.response) {
      logger.api.error('Network error - no response received:', error.request);
      return Promise.reject(new Error('Network error - server may be down'));
    }
    
    logger.api.error('Request error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
