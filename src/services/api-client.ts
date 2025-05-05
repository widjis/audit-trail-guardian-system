
import axios from 'axios';

// Create base API client
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
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
  console.log(`[API Client] ${config.method?.toUpperCase()} ${config.url}`, config.data ? 'with data:' : '');
  if (config.data) {
    console.log('[API Client] Request data:', config.data);
  }
  
  return config;
});

// Add response and error handler
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`[API Client] Response from ${response.config.url}:`, 
      response.status, response.statusText);
    console.log('[API Client] Response data:', response.data);
    return response;
  },
  (error) => {
    // Detailed error logging
    if (error.response) {
      // Handle specific error responses
      const { status, data, config } = error.response;
      
      console.error(`[API Client] Error ${status} from ${config.url}:`, data);
      
      if (status === 401) {
        // Unauthorized - redirect to login
        console.error('[API Client] Unauthorized access, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else if (status === 503) {
        // Service unavailable - likely database connection issue
        console.error('[API Client] Database connection error:', data.error || 'Service unavailable');
      }
      
      // Convert the error message from the server
      const message = data.error || 'An unexpected error occurred';
      return Promise.reject(new Error(message));
    }
    
    // Handle network errors
    if (error.request && !error.response) {
      console.error('[API Client] Network error - no response received:', error.request);
      return Promise.reject(new Error('Network error - server may be down'));
    }
    
    console.error('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
