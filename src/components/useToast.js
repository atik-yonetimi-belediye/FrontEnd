import { useContext } from 'react';
import ToastContext from './toastContextStore';

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast, ToastProvider içinde kullanılmalıdır.');
  }
  return context;
};
