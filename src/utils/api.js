import axios from 'axios';

// Prefer an explicit backend origin in every environment. This makes local
// overrides work even when another project occupies the package.json proxy
// port. The relative fallback keeps the development proxy available.
const configuredApiOrigin = process.env.REACT_APP_API_URL?.replace(/\/$/, '');

const api = axios.create({
  baseURL: configuredApiOrigin ? `${configuredApiOrigin}/api` : '/api',
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
  async (error) => {
    // Invalidate stale identity data without forcing public pages to /login.
    // ProtectedRoute listens for this event and owns protected navigation.
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('orgId');
      localStorage.removeItem('teamId');
      window.dispatchEvent(new Event('signaltrue:session-invalidated'));

      // Public endpoints may accept anonymous requests but reject a stale
      // bearer token. Retry those requests once after removing the token.
      if (error.config?.headers?.Authorization && !error.config._retriedWithoutAuth) {
        error.config._retriedWithoutAuth = true;
        if (typeof error.config.headers.delete === 'function') {
          error.config.headers.delete('Authorization');
        } else {
          delete error.config.headers.Authorization;
        }
        return api.request(error.config);
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
