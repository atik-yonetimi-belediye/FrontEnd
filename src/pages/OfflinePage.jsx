import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudOff, RefreshCw } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/useAuth';
import { flushOfflineQueue, getOfflineQueueCount } from '../services/offlineQueue';

export default function OfflinePage() {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);
  useEffect(() => { getOfflineQueueCount(user?.id).then(setPending).catch(() => setPending(0)); }, [user?.id]);

  const retry = async () => {
    await flushOfflineQueue(user?.id);
    const nextPending = await getOfflineQueueCount(user?.id);
    setPending(nextPending);
    if (navigator.onLine && nextPending === 0) window.location.assign(user ? `/${user.role === 'admin' ? 'admin' : user.role}` : '/');
  };

  return (
    <main id="main-content" className="fatal-error" tabIndex="-1">
      <div className="fatal-error-card">
        <CloudOff size={52} aria-hidden="true" color="var(--warning-color)" />
        <h1>Çevrimdışı çalışma</h1>
        <p>Uygulama kabuğu ve daha önce alınan şoför görevleri kullanılabilir. Yeni saha kayıtları bağlantı geldiğinde güvenli şekilde gönderilir.</p>
        <p role="status"><strong>Bekleyen kayıt: {pending}</strong></p>
        <Button onClick={retry}><RefreshCw size={18} /> Bağlantıyı Kontrol Et</Button>
        <Button as={Link} to={user ? `/${user.role === 'admin' ? 'admin' : user.role}` : '/'} variant="outline">Uygulamaya Dön</Button>
      </div>
    </main>
  );
}
