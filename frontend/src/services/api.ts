import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeFleetId = localStorage.getItem('jk_active_fleet_id');
  if (activeFleetId) {
    config.headers['X-Fleet-ID'] = activeFleetId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jk_token');
      localStorage.removeItem('jk_user');
      // If not on login/landing page, redirect
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register') && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
