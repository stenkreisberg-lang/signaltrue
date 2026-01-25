import axios from 'axios';

// In development, we rely on the 'proxy' setting in package.json to route requests.
// The base URL can be relative ('/api').
// In production, REACT_APP_API_URL should be set to the absolute URL of your backend.
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? '/api' 
    : `${process.env.REACT_APP_API_URL}/api`,
  timeout: 30000, // 30 second timeout
});

// Add an interceptor to include the auth token from localStorage in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error - API may be unavailable');
    }
    
    return Promise.reject(error);
  }
);

export default api;
