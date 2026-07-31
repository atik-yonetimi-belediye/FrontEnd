import React from 'react';
import Button from './Button';
import './AppState.css';

export function AppBootScreen({ message = 'Uygulama hazırlanıyor…' }) {
  return (
    <div className="app-boot-screen" role="status" aria-live="polite">
      <div className="app-boot-mark" aria-hidden="true">12</div>
      <div className="app-boot-copy"><strong>Onikişubat Belediyesi</strong><span>{message}</span></div>
      <div className="app-boot-progress" aria-hidden="true"><span /></div>
    </div>
  );
}

export function ContentState({ type = 'empty', title, message, onRetry }) {
  return (
    <div className={`content-state content-state-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {onRetry && <Button variant="outline" onClick={onRetry}>Yeniden Dene</Button>}
    </div>
  );
}
