import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://out-box-scheduled-email-c47jvzj2i.vercel.app';
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? `${backendUrl}/api` : 'http://localhost:5000/api');

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

// Interceptor to handle global authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Interceptor] 401 Unauthorized detected.');
      // Only clear if on protected subpages, not during login navigation
    }
    return Promise.reject(error);
  }
);

export default api;
