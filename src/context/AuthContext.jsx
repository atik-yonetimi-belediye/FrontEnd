import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AuthContext from './authContextStore';

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

  const login = async (role, credentials) => {
    try {
      // role can be: 'admin', 'cavus', 'sofor', 'sirket'
      const response = await api.post(`/auth/${role}/login`, credentials);
      if (response.data.success) {
        const { user: newUser } = response.data.data;
        if (newUser.role !== role) {
          throw new Error('Sunucu rolü ile istenen rol eşleşmiyor.');
        }
        
        setUser(newUser);
        return { success: true };
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
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
