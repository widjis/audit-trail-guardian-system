
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
  return config;
});

// Add response error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error responses
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else if (status === 503) {
        // Service unavailable - likely database connection issue
        console.error('Database connection error:', data.error || 'Service unavailable');
      }
      
      // Convert the error message from the server
      const message = data.error || 'An unexpected error occurred';
      return Promise.reject(new Error(message));
    }
    
    // Handle network errors
    if (error.request && !error.response) {
      console.error('Network error - server may be down');
      return Promise.reject(new Error('Network error - server may be down'));
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
