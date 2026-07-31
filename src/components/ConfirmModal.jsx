import React, { useId, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import Button from './Button';
import './ConfirmModal.css';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap';

const ConfirmModal = ({
  isOpen,
  title = "Onay Gerekiyor",
  message,
  confirmText = "Evet, Devam Et",
  confirmDisabled = false,
  cancelText = "İptal",
  variant = "warning", // 'warning' | 'danger' | 'info' | 'success'
  onConfirm,
  onCancel,
  children
}) => {
  const dialogRef = useRef(null);
  const titleId = useId();
  const messageId = useId();
  useDialogFocusTrap(dialogRef, isOpen, onCancel);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (variant) {
      case 'danger':
        return <XCircle size={32} className="modal-icon text-danger" />;
      case 'success':
        return <CheckCircle size={32} className="modal-icon text-success" />;
      case 'info':
        return <Info size={32} className="modal-icon text-info" />;
      default:
        return <AlertTriangle size={32} className="modal-icon text-warning" />;
    }
  };

  return (
    <div className="custom-modal-backdrop animate-fade-in" onClick={onCancel}>
      <div 
        ref={dialogRef}
        className="custom-modal-window glass-panel" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        tabIndex={-1}
      >
        <button className="modal-close-btn" onClick={onCancel} aria-label="Pencereyi kapat">
          <X size={20} />
        </button>

        <div className="modal-header-icon">
          {renderIcon()}
        </div>

        <h3 className="modal-title" id={titleId}>{title}</h3>
        {message && <p className="modal-message" id={messageId}>{message}</p>}
        {children}

        <div className="modal-actions">
          {cancelText && (
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
