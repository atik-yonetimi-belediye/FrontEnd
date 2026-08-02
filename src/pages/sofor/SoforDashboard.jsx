import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import MapBaseLayer from '../../components/maps/MapBaseLayer';
import { MapPin, CheckCircle, XCircle, AlertTriangle, Camera, LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './SoforDashboard.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPages } from '../../services/pagination';
import { createIdempotencyKey, queueOfflineRequest } from '../../services/offlineQueue';
import { useToast } from '../../components/useToast';
import { useAuth } from '../../context/useAuth';
import { trackPilotEvent } from '../../services/observability';
import { hasPermission } from '../../utils/permissions';

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
  const taskQueryKey = ['sofor', 'gorevler'];
  const { data: konteynerler = [], isPending: loading, isError, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchAllPages('/sofor/konteynerler', { signal }),
  });
  const { data: gorevler = [], refetch: refetchTasks } = useQuery({
    queryKey: taskQueryKey,
    queryFn: ({ signal }) => fetchAllPages('/sofor/gorevler', { signal }),
  });
  const [userLocation, setUserLocation] = useState(null);
  
  // Modal state
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [selectedKonteyner, setSelectedKonteyner] = useState(null);
  const [skipReason, setSkipReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [evidenceLocation, setEvidenceLocation] = useState(null);
  const [locationBusy, setLocationBusy] = useState(false);

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

  const resetEvidence = () => { setEvidencePhoto(null); setEvidenceLocation(null); };
  const openCompleteModal = (container) => { setSelectedKonteyner(container); resetEvidence(); setCompleteModalOpen(true); };
  const captureEvidenceLocation = () => {
    if (!navigator.geolocation) return showToast('Bu cihaz konum özelliğini desteklemiyor.', 'error');
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setEvidenceLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, konum_dogruluk_metre: position.coords.accuracy }); setLocationBusy(false);
    }, () => { setLocationBusy(false); showToast('Konum alınamadı. Tarayıcı iznini kontrol edin.', 'error'); }, { enableHighAccuracy: true, timeout: 10000 });
  };
  const evidenceRequest = (payload, idempotencyKey) => {
    if (!evidencePhoto) return api.post('/sofor/toplama-kayitlari', { ...payload, ...evidenceLocation }, { headers: { 'Idempotency-Key': idempotencyKey } });
    const form = new FormData();
    Object.entries({ ...payload, ...evidenceLocation }).forEach(([key, value]) => { if (value !== null && value !== undefined) form.append(key, value); });
    form.append('kanit_fotografi', evidencePhoto);
    return api.post('/sofor/toplama-kayitlari', form, { headers: { 'Idempotency-Key': idempotencyKey } });
  };

  const handleToplandi = async (id) => {
    const payload = { konteyner_id: id, durum: 'toplandi' };
    const idempotencyKey = createIdempotencyKey();
    try {
      if (!navigator.onLine) throw new Error('offline');
      await evidenceRequest(payload, idempotencyKey);
      queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== id));
      queryClient.setQueryData(taskQueryKey, (previous = []) => previous.filter(g => g.konteyner_id !== id));
      showToast('Toplama kaydı oluşturuldu.', 'success');
      setCompleteModalOpen(false); resetEvidence();
      trackPilotEvent('collection_success', performance.now() - operationStartedAt.current);
      operationStartedAt.current = performance.now();
    } catch (error) {
      if (!error.response && !evidencePhoto) {
        await queueOfflineRequest('/sofor/toplama-kayitlari', payload, idempotencyKey, user?.id);
        queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== id));
        queryClient.setQueryData(taskQueryKey, (previous = []) => previous.filter(g => g.konteyner_id !== id));
        showToast('Kayıt çevrimdışı kuyruğa alındı. Bağlantı gelince gönderilecek.', 'info');
        trackPilotEvent('collection_queued', performance.now() - operationStartedAt.current);
      } else {
        showToast(!navigator.onLine && evidencePhoto ? 'Fotoğraf kanıtı çevrimdışı kuyruğa alınamaz. Bağlantı geldiğinde yeniden deneyin.' : 'İşlem tamamlanamadı. Lütfen yeniden deneyin.', 'error');
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
    resetEvidence();
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
      await evidenceRequest(payload, idempotencyKey);
      queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== selectedKonteyner.id));
      queryClient.setQueryData(taskQueryKey, (previous = []) => previous.filter(g => g.konteyner_id !== selectedKonteyner.id));
      setSkipModalOpen(false);
      showToast('Atlama kaydı oluşturuldu.', 'success');
      trackPilotEvent('skip_success', performance.now() - operationStartedAt.current);
      operationStartedAt.current = performance.now();
    } catch (error) {
      if (!error.response && !evidencePhoto) {
        await queueOfflineRequest('/sofor/toplama-kayitlari', payload, idempotencyKey, user?.id);
        queryClient.setQueryData(queryKey, (previous = []) => previous.filter(k => k.id !== selectedKonteyner.id));
        queryClient.setQueryData(taskQueryKey, (previous = []) => previous.filter(g => g.konteyner_id !== selectedKonteyner.id));
        setSkipModalOpen(false);
        showToast('Kayıt çevrimdışı kuyruğa alındı. Bağlantı gelince gönderilecek.', 'info');
        trackPilotEvent('skip_queued', performance.now() - operationStartedAt.current);
      } else {
        showToast(!navigator.onLine && evidencePhoto ? 'Fotoğraf kanıtı çevrimdışı kuyruğa alınamaz.' : 'İşlem tamamlanamadı. Lütfen yeniden deneyin.', 'error');
        trackPilotEvent('skip_failed', performance.now() - operationStartedAt.current);
      }
    }
  };

  const startTask = async (taskId) => {
    try {
      await api.patch(`/sofor/gorevler/${taskId}/baslat`);
      await refetchTasks();
      showToast('Görev başlatıldı. Güvenli sürüşler.', 'success');
    } catch {
      showToast('Görev başlatılamadı. Lütfen yeniden deneyin.', 'error');
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
  const activeTasks = gorevler.filter((task) => ['atandi', 'devam_ediyor'].includes(task.durum));
  const assignedContainerIds = new Set(activeTasks.map((task) => task.konteyner_id));
  const otherContainers = konteynerler.filter((container) => !assignedContainerIds.has(container.id));
  const pendingTaskCount = activeTasks.filter((task) => task.durum === 'atandi').length;
  const activeTaskCount = activeTasks.filter((task) => task.durum === 'devam_ediyor').length;
  const overdueTaskCount = activeTasks.filter((task) => task.gecikti_mi).length;

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
          <AlertTriangle size={20} /> Öncelikle size atanan görevleri tamamlayın.
        </div>

        <section className="driver-task-summary" aria-label="Görev özeti">
          <div><span>Bana Atanan</span><strong>{activeTasks.length}</strong></div>
          <div><span>Bekleyen</span><strong>{pendingTaskCount}</strong></div>
          <div><span>Devam Eden</span><strong>{activeTaskCount}</strong></div>
          <div className={overdueTaskCount ? 'danger' : ''}><span>Geciken</span><strong>{overdueTaskCount}</strong></div>
        </section>

        <section className="assigned-task-section" aria-labelledby="assigned-task-title">
          <div className="driver-section-title"><div><h3 id="assigned-task-title">Bana Atanan Görevler</h3><p>Yönetici tarafından önceliklendirilen konteynerler</p></div><span>{activeTasks.length}</span></div>
          {activeTasks.length === 0 ? <div className="driver-empty-state glass-panel"><CheckCircle size={22} /> Açık atanmış göreviniz bulunmuyor.</div> : activeTasks.map((task) => (
            <article className={`assigned-task-card glass-panel priority-${task.oncelik} ${task.gecikti_mi ? 'overdue' : ''}`} key={task.id}>
              <header><div><span className="task-priority">{task.oncelik === 'acil' ? 'ACİL' : task.oncelik === 'yuksek' ? 'YÜKSEK' : task.oncelik === 'dusuk' ? 'DÜŞÜK' : 'NORMAL'}</span><h4>{task.konteyner_kodu}</h4></div><span className={`driver-task-status ${task.durum}`}>{task.durum === 'devam_ediyor' ? 'YOLA ÇIKILDI' : 'BEKLİYOR'}</span></header>
              <dl><div><dt>Mahalle</dt><dd>{task.mahalle_ad}</dd></div><div><dt>Araç</dt><dd>{task.plaka}</dd></div><div><dt>Hedef</dt><dd>{task.hedef_tarih ? new Date(task.hedef_tarih).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : 'Belirlenmedi'}{task.gecikti_mi && <small>Gecikti</small>}</dd></div></dl>
              {task.yonetici_notu && <p className="driver-task-note">{task.yonetici_notu}</p>}
              <div className="assigned-task-actions">
                {hasPermission(user, 'route.open') && <Button as="a" href={`https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`} target="_blank" rel="noopener noreferrer" variant="outline">🗺️ Yol Tarifi</Button>}
                {task.durum === 'atandi' && <Button variant="outline" onClick={() => startTask(task.id)}>Yola Çık</Button>}
                {hasPermission(user, 'collection.skip') && <Button variant="outline" className="text-danger border-danger" onClick={() => openSkipModal({ ...task, id: task.konteyner_id })}><XCircle size={17} /> Atla</Button>}
                {hasPermission(user, 'collection.complete') && <Button variant="primary" onClick={() => openCompleteModal({ ...task, id: task.konteyner_id })}><CheckCircle size={17} /> Toplandı</Button>}
              </div>
            </article>
          ))}
        </section>
        
        {/* Rota Haritası */}
        <div className="sofor-map-container glass-panel mb-4">
          <MapContainer center={center} zoom={15} style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-lg)' }}>
            <MapBaseLayer />
            
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

        <div className="driver-section-title other"><div><h3>Bölgenizdeki Diğer Konteynerler</h3><p>Araç türünüze uygun saha listesi</p></div><span>{otherContainers.length}</span></div>
        <div className="konteyner-list">
          {otherContainers.length === 0 ? (
            <div className="glass-panel p-4 text-center">Tüm görevler tamamlandı! Harikasınız.</div>
          ) : (
            otherContainers.map(k => (
              <div key={k.id} className="konteyner-card glass-panel">
                <div className="k-card-header">
                  <div className="k-title">
                    <MapPin size={18} className="text-primary" /> 
                    <span>{k.konteyner_kodu}</span>
                  </div>
                  <span className="k-badge">{k.mahalle_ad}</span>
                </div>
                <div className="k-actions" style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                  {hasPermission(user, 'route.open') && <Button
                    as="a"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${k.latitude},${k.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    className="w-full"
                    style={{ flex: 1, textDecoration: 'none' }}
                  >
                    🗺️ Yol Tarifi
                  </Button>}
                  {hasPermission(user, 'collection.skip') && <Button variant="outline" className="action-btn text-danger border-danger" onClick={() => openSkipModal(k)}>
                    <XCircle size={18} /> Atla
                  </Button>}
                  {hasPermission(user, 'collection.complete') && <Button variant="primary" className="action-btn" onClick={() => openCompleteModal(k)}>
                    <CheckCircle size={18} /> Toplandı
                  </Button>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={completeModalOpen}
        title={`${selectedKonteyner?.konteyner_kodu || 'Konteyner'} Toplandı`}
        message="Zaman otomatik kaydedilir. Fotoğraf ve konum isteğe bağlıdır."
        confirmText="Toplandı Olarak Kaydet"
        variant="success"
        onConfirm={() => handleToplandi(selectedKonteyner.id)}
        onCancel={() => { setCompleteModalOpen(false); resetEvidence(); }}
      >
        {hasPermission(user, 'collection.attach_evidence') && <div className="collection-evidence"><label className="evidence-photo"><Camera size={19} /><span>{evidencePhoto ? evidencePhoto.name : 'Fotoğraf çek veya seç'}<small>JPG, PNG veya WEBP · en fazla 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setEvidencePhoto(event.target.files?.[0] || null)} /></label><Button type="button" variant="outline" onClick={captureEvidenceLocation} disabled={locationBusy}><LocateFixed size={18} /> {locationBusy ? 'Konum alınıyor…' : evidenceLocation ? `Konum alındı (±${Math.round(evidenceLocation.konum_dogruluk_metre)} m)` : 'Konumu Kaydet'}</Button></div>}
      </ConfirmModal>

      {/* Skip Modal */}
      <ConfirmModal
        isOpen={skipModalOpen}
        title={`${selectedKonteyner?.konteyner_kodu || 'Konteyner'} Neden Atlandı?`}
        confirmText="Atlandı Olarak Kaydet"
        variant="danger"
        onConfirm={submitSkip}
        onCancel={() => { setSkipModalOpen(false); resetEvidence(); }}
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
            {hasPermission(user, 'collection.attach_evidence') && <div className="collection-evidence"><label className="evidence-photo"><Camera size={19} /><span>{evidencePhoto ? evidencePhoto.name : 'İsteğe bağlı fotoğraf'}<small>JPG, PNG veya WEBP · en fazla 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setEvidencePhoto(event.target.files?.[0] || null)} /></label><Button type="button" variant="outline" onClick={captureEvidenceLocation} disabled={locationBusy}><LocateFixed size={18} /> {locationBusy ? 'Konum alınıyor…' : evidenceLocation ? `Konum alındı (±${Math.round(evidenceLocation.konum_dogruluk_metre)} m)` : 'Konumu Kaydet'}</Button></div>}
      </ConfirmModal>
    </DashboardLayout>
  );
};

export default SoforDashboard;
