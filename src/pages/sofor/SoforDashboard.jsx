import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import { MapPin, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './SoforDashboard.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPages } from '../../services/pagination';
import { createIdempotencyKey, queueOfflineRequest } from '../../services/offlineQueue';
import { useToast } from '../../components/useToast';
import { useAuth } from '../../context/useAuth';
import { trackPilotEvent } from '../../services/observability';

const createIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: var(--warning-color); width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createTruckIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: #ef4444; width: 100%; height: 100%; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px;">🚛</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const SoforDashboard = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const operationStartedAt = useRef(performance.now());
  const queryKey = ['sofor', 'konteynerler'];
  const { data: konteynerler = [], isPending: loading, isError, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchAllPages('/sofor/konteynerler', { signal }),
  });
  const [userLocation, setUserLocation] = useState(null);
  
  // Modal state
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [selectedKonteyner, setSelectedKonteyner] = useState(null);
  const [skipReason, setSkipReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  // Default center
  const center = [37.5858, 36.9145];

  useEffect(() => {
    // Geolocation tracker
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => setUserLocation(null),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleToplandi = async (id) => {
    const payload = { konteyner_id: id, durum: 'toplandi' };
    const idempotencyKey = createIdempotencyKey();
    try {
      if (!navigator.onLine) throw new Error('offline');
      await api.post('/sofor/toplama-kayitlari', payload, { headers: { 'Idempotency-Key': idempotencyKey } });
      queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== id));
      showToast('Toplama kaydı oluşturuldu.', 'success');
      trackPilotEvent('collection_success', performance.now() - operationStartedAt.current);
      operationStartedAt.current = performance.now();
    } catch (error) {
      if (!error.response) {
        await queueOfflineRequest('/sofor/toplama-kayitlari', payload, idempotencyKey, user?.id);
        queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== id));
        showToast('Kayıt çevrimdışı kuyruğa alındı. Bağlantı gelince gönderilecek.', 'info');
        trackPilotEvent('collection_queued', performance.now() - operationStartedAt.current);
      } else {
        showToast('İşlem tamamlanamadı. Lütfen yeniden deneyin.', 'error');
        trackPilotEvent('collection_failed', performance.now() - operationStartedAt.current);
      }
    }
  };

  const [skipError, setSkipError] = useState(false);

  const openSkipModal = (konteyner) => {
    setSelectedKonteyner(konteyner);
    setSkipReason('');
    setOtherReason('');
    setSkipError(false);
    setSkipModalOpen(true);
  };

  const submitSkip = async () => {
    if (!skipReason) {
      setSkipError(true);
      return;
    }
    setSkipError(false);
    const payload = {
        konteyner_id: selectedKonteyner.id,
        durum: 'atlanildi',
        sebep: skipReason,
        diger_aciklama: skipReason === 'Diğer' ? otherReason : null
    };
    const idempotencyKey = createIdempotencyKey();
    try {
      if (!navigator.onLine) throw new Error('offline');
      await api.post('/sofor/toplama-kayitlari', payload, { headers: { 'Idempotency-Key': idempotencyKey } });
      queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== selectedKonteyner.id));
      setSkipModalOpen(false);
      showToast('Atlama kaydı oluşturuldu.', 'success');
      trackPilotEvent('skip_success', performance.now() - operationStartedAt.current);
      operationStartedAt.current = performance.now();
    } catch (error) {
      if (!error.response) {
        await queueOfflineRequest('/sofor/toplama-kayitlari', payload, idempotencyKey, user?.id);
        queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== selectedKonteyner.id));
        setSkipModalOpen(false);
        showToast('Kayıt çevrimdışı kuyruğa alındı. Bağlantı gelince gönderilecek.', 'info');
        trackPilotEvent('skip_queued', performance.now() - operationStartedAt.current);
      } else {
        showToast('İşlem tamamlanamadı. Lütfen yeniden deneyin.', 'error');
        trackPilotEvent('skip_failed', performance.now() - operationStartedAt.current);
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Günlük Rota">
        <div className="sofor-dashboard" style={{ marginTop: '1rem' }}>
          <div className="sofor-map-container glass-panel mb-4" style={{ height: '320px', padding: '1rem' }}>
            <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }} />
          </div>
          <div className="glass-panel mb-4" style={{ padding: '1.25rem', height: '65px', display: 'flex', alignItems: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: '60%', height: '20px', margin: 0 }} />
          </div>
          <div className="route-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[1, 2].map(n => (
              <div key={n} className="konteyner-card glass-panel" style={{ padding: '1.25rem', height: '180px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="skeleton skeleton-title" style={{ width: '50%', height: '18px', margin: 0 }} />
                  <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton skeleton-text" style={{ width: '80%', height: '12px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '60%', height: '12px', marginBottom: '1.5rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="skeleton" style={{ width: '50%', height: '35px', borderRadius: 'var(--radius-sm)' }} />
                  <div className="skeleton" style={{ width: '50%', height: '35px', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const positions = konteynerler
    .filter(k => k.latitude && k.longitude)
    .map(k => [k.latitude, k.longitude]);

  return (
    <DashboardLayout title="Günlük Rota">
      <div className="sofor-dashboard">
        {isError && (
          <div className="error-banner" role="alert">
            Görev listesi alınamadı. Bağlantınızı kontrol edip yeniden deneyin.
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Yeniden Dene
            </Button>
          </div>
        )}
        <div className="dashboard-header-alert">
          <AlertTriangle size={20} /> Lütfen sıradaki konteynerleri ziyaret edin.
        </div>
        
        {/* Rota Haritası */}
        <div className="sofor-map-container glass-panel mb-4">
          <MapContainer center={center} zoom={15} style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-lg)' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            
            {/* Draw route lines */}
            {positions.length > 1 && (
              <Polyline positions={positions} color="#f59e0b" weight={3} dashArray="8,6" opacity={0.8} />
            )}

            {/* Containers */}
            {konteynerler.map(k => (
              k.latitude && k.longitude && (
                <Marker key={k.id} position={[k.latitude, k.longitude]} icon={createIcon()} title={`${k.konteyner_kodu} görevi`} alt={`${k.konteyner_kodu} görevi`}>
                  <Popup className="custom-popup">
                    <div className="popup-content" style={{ textAlign: 'center' }}>
                      <strong className="popup-title">{k.konteyner_kodu}</strong><br/>
                      <small className="popup-subtitle">{k.mahalle_ad} Mah.</small>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            {/* User (Driver) Location */}
            {userLocation && (
              <Marker position={userLocation} icon={createTruckIcon()} title="Mevcut konumunuz" alt="Mevcut konumunuz">
                <Popup className="custom-popup">
                  <div className="popup-content">
                    <strong className="popup-title">Şu anki Konumunuz</strong>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="konteyner-list">
          {konteynerler.length === 0 ? (
            <div className="glass-panel p-4 text-center">Tüm görevler tamamlandı! Harikasınız.</div>
          ) : (
            konteynerler.map(k => (
              <div key={k.id} className="konteyner-card glass-panel">
                <div className="k-card-header">
                  <div className="k-title">
                    <MapPin size={18} className="text-primary" /> 
                    <span>{k.konteyner_kodu}</span>
                  </div>
                  <span className="k-badge">{k.mahalle_ad}</span>
                </div>
                <div className="k-actions" style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                  <Button
                    as="a"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${k.latitude},${k.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    className="w-full"
                    style={{ flex: 1, textDecoration: 'none' }}
                  >
                    🗺️ Yol Tarifi
                  </Button>
                  <Button variant="outline" className="action-btn text-danger border-danger" onClick={() => openSkipModal(k)}>
                    <XCircle size={18} /> Atla
                  </Button>
                  <Button variant="primary" className="action-btn" onClick={() => handleToplandi(k.id)}>
                    <CheckCircle size={18} /> Toplandı
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Skip Modal */}
      <ConfirmModal
        isOpen={skipModalOpen}
        title={`${selectedKonteyner?.konteyner_kodu || 'Konteyner'} Neden Atlandı?`}
        confirmText="Atlandı Olarak Kaydet"
        variant="danger"
        onConfirm={submitSkip}
        onCancel={() => setSkipModalOpen(false)}
      >
            <select 
              className="custom-select mt-4" 
              value={skipReason} 
              onChange={e => {
                setSkipReason(e.target.value);
                if (e.target.value) setSkipError(false);
              }}
            >
              <option value="">Sebep Seçin...</option>
              <option value="Yol Kapalı">Yol Kapalı</option>
              <option value="Araç Arızası">Araç Arızası</option>
              <option value="Konteyner Boş">Konteyner Boş</option>
              <option value="Diğer">Diğer (Açıklama girin)</option>
            </select>

            {skipError && (
              <p className="text-danger mt-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                ⚠️ Lütfen devam etmek için bir atlama sebebi seçiniz.
              </p>
            )}
            
            {skipReason === 'Diğer' && (
              <textarea 
                className="custom-textarea mt-4"
                rows="3"
                placeholder="Lütfen açıklayınız..."
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
              />
            )}
      </ConfirmModal>
    </DashboardLayout>
  );
};

export default SoforDashboard;
