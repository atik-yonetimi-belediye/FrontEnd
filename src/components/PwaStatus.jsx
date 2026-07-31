import React, { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import Button from './Button';
import './PwaStatus.css';
import { flushOfflineQueue } from '../services/offlineQueue';
import { useAuth } from '../context/useAuth';
import { Link } from 'react-router-dom';

export default function PwaStatus() {
  const { user } = useAuth();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() { setUpdateReady(true); },
      onRegisteredSW(_url, registration) { registration?.update(); },
    });
    setUpdateSW(() => update);
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

  if (online && !updateReady) return null;
  return (
    <aside className={`pwa-status ${online ? 'pwa-update' : 'pwa-offline'}`} aria-live="polite">
      <div><strong>{online ? 'Yeni sürüm hazır' : 'Çevrimdışısınız'}</strong><span>{online ? 'Güncelleyerek en yeni sürümü kullanın.' : 'Kayıtlarınız korunacak; bağlantı gelince gönderilecek.'}</span></div>
      {updateReady ? <Button size="sm" onClick={() => updateSW?.(true)}>Güncelle</Button> : <Button as={Link} to="/cevrimdisi" size="sm" variant="outline">Detay</Button>}
    </aside>
  );
}
