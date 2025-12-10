import axios from 'axios';

// In development, we rely on the 'proxy' setting in package.json to route requests.
// The base URL can be relative ('/api').
// In production, REACT_APP_API_URL should be set to the absolute URL of your backend.
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? '/api' 
    : `${process.env.REACT_APP_API_URL}/api`,
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

export default api;
