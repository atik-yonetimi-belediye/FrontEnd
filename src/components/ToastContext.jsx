import React, { useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import './Toast.css';
import ToastContext from './toastContextStore';

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} style={{ color: 'var(--success-color)' }} />;
      case 'error': return <XCircle size={20} style={{ color: 'var(--danger-color)' }} />;
      case 'warning': return <AlertCircle size={20} style={{ color: 'var(--warning-color)' }} />;
      default: return <Info size={20} style={{ color: 'var(--info-color)' }} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            {getIcon(t.type)}
            <div className="toast-content">{t.message}</div>
            <button className="toast-close-btn" onClick={() => removeToast(t.id)} aria-label="Bildirimi kapat">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
