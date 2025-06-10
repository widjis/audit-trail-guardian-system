
import axios from 'axios';

// API base URLs based on environment
const API_URL = import.meta.env.VITE_API_URL || '/api';
console.log('API URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 100000, // 60 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to attach authorization token to requests
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Log the error for debugging
    console.error('API error:', error);
    
    if (error.response) {
      // The server responded with a status code outside of 2xx range
      console.error('Response error data:', error.response.data);
      console.error('Response error status:', error.response.status);
      
      // Handle 401 Unauthorized - redirect to login
      if (error.response.status === 401) {
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('login')) {
          console.warn('Unauthorized access, redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(new Error('Unauthorized access, please login again'));
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request was made but no response received:', error.request);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
