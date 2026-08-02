import React, { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import './PwaStatus.css';
import { flushOfflineQueue } from '../services/offlineQueue';
import { useAuth } from '../context/useAuth';

export default function PwaStatus() {
  const { user } = useAuth();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateState, setUpdateState] = useState(() => sessionStorage.getItem('pwa-update-applied') ? 'updated' : 'idle');

  useEffect(() => {
    let hideTimer;
    if (sessionStorage.getItem('pwa-update-applied')) {
      sessionStorage.removeItem('pwa-update-applied');
      hideTimer = window.setTimeout(() => setUpdateState('idle'), 5000);
    }
    let registration;
    let applying = false;
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (applying) return;
        applying = true;
        setUpdateState('updating');
        sessionStorage.setItem('pwa-update-applied', '1');
        update(true);
      },
      onRegisteredSW(_url, value) { registration = value; registration?.update(); },
    });
    const check = () => { if (navigator.onLine) registration?.update().catch(() => {}); };
    const interval = window.setInterval(check, 60_000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); flushOfflineQueue(user?.id).catch(() => {}); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) flushOfflineQueue(user?.id).catch(() => {});
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.id]);

  if (online && updateState === 'idle') return null;
  return (
    <aside className={`pwa-status ${online ? 'pwa-update' : 'pwa-offline'}`} aria-live="polite" role="status">
      <div><strong>{!online ? 'Çevrimdışısınız' : updateState === 'updated' ? 'Uygulama güncellendi' : 'Yeni sürüm yükleniyor'}</strong><span>{!online ? 'Kayıtlarınız korunacak; bağlantı gelince gönderilecek.' : updateState === 'updated' ? 'En yeni sürümü kullanıyorsunuz.' : 'Güncelleme otomatik uygulanıyor…'}</span></div>
    </aside>
  );
}
