import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AuthContext from './authContextStore';
import { AppBootScreen } from '../components/AppState';
import { clearPrivateCaches } from '../services/offlineQueue';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const handleAuthError = () => {
      if (active) setUser(null);
    };
    window.addEventListener('auth-error', handleAuthError);

    api.get('/auth/session')
      .then((response) => {
        const sessionUser = response.data?.data?.user;
        if (active && sessionUser?.role) setUser(sessionUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success) {
        const { user: newUser } = response.data.data;
        if (!['admin', 'cavus', 'sofor', 'sirket'].includes(newUser?.role)) {
          throw new Error('Sunucudan geçersiz kullanıcı rolü döndü.');
        }
        
        setUser(newUser);
        return { success: true, user: newUser };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Giriş yapılamadı' 
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await clearPrivateCaches().catch(() => {});
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {loading ? <AppBootScreen message="Oturumunuz güvenli şekilde kontrol ediliyor…" /> : children}
    </AuthContext.Provider>
  );
};
