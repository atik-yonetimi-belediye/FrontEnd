import { useContext } from 'react';
import AuthContext from './authContextStore';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  }
  return context;
};
