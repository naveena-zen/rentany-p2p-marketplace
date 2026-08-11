import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rentany_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if checking /auth/me
      if (!error.config.url.includes('/auth/me')) {
        localStorage.removeItem('rentany_token');
        localStorage.removeItem('rentany_user');
      }
    }
    return Promise.reject(error);
  }
);
