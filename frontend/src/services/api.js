import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Intercepteur pour injecter automatiquement le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('livreo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer l'expiration du token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Déconnexion propre si session expirée
      const isLoginRequest = error.config.url.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('livreo_token');
        localStorage.removeItem('livreo_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
