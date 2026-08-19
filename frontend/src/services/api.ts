import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const API_BASE_URL = import.meta.env.VITE_API_URL 
  || (backendUrl ? `${backendUrl}/api` : (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'));

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to automatically add JWT from localStorage to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('reachinbox_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle global authentication errors (e.g. JWT expiration)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Interceptor] 401 Unauthorized detected. Clearing session.');
      localStorage.removeItem('reachinbox_token');
      
      // Auto-redirect to login if not already on the landing page
      if (
        window.location.pathname !== '/login' && 
        window.location.pathname !== '/' && 
        !window.location.pathname.startsWith('/auth')
      ) {
        window.location.href = '/login?error=session_expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
