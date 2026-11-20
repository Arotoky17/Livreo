import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);
const loginRoles = ['ADMIN', 'DELIVERY', 'SELLER'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('livreo_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('livreo_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('livreo_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (!loginRoles.includes(res.data.user.role)) {
            logout();
            setLoading(false);
            return;
          }
          setUser(res.data.user);
          localStorage.setItem('livreo_user', JSON.stringify(res.data.user));
        } catch (error) {
          console.error('Session expirée ou invalide', error);
          logout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    if (!loginRoles.includes(receivedUser.role)) {
      throw new Error('Cet espace de connexion est indisponible.');
    }

    localStorage.setItem('livreo_token', receivedToken);
    localStorage.setItem('livreo_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  function logout() {
    localStorage.removeItem('livreo_token');
    localStorage.removeItem('livreo_user');
    setToken(null);
    setUser(null);
  }

  const updateProfilePhoto = async (image) => {
    const response = image === null
      ? await api.delete('/users/me/photo')
      : await api.put('/users/me/photo', { image });
    const avatarUrl = response.data.avatarUrl;
    setUser((previous) => {
      if (!previous) return previous;
      const updated = { ...previous, avatarUrl };
      localStorage.setItem('livreo_user', JSON.stringify(updated));
      return updated;
    });
    return avatarUrl;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateProfilePhoto,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isSeller: user?.role === 'SELLER',
        isDelivery: user?.role === 'DELIVERY',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
