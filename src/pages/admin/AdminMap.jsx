import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import DashboardLayout from '../../components/DashboardLayout';
import MapBaseLayer from '../../components/maps/MapBaseLayer';
import ConfirmModal from '../../components/ConfirmModal';
import Button from '../../components/Button';
import api, { getApiErrorMessage } from '../../services/api';
import { fetchAllPages } from '../../services/pagination';
import 'leaflet/dist/leaflet.css';
import './AdminMap.css';

const typeLabel = (type) => type === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık';
const priorityLabel = { dusuk: 'Düşük', normal: 'Normal', yuksek: 'Yüksek', acil: 'Acil' };
const statusLabel = { atandi: 'Atandı', devam_ediyor: 'Yola Çıkıldı', tamamlandi: 'Tamamlandı', atlandi: 'Atlandı', iptal_edildi: 'İptal Edildi' };
const formatDate = (value) => value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : 'Belirlenmedi';

const healthColor = { yesil: '#10b981', sari: '#f59e0b', kirmizi: '#ef4444' };
const EMPTY_CONTAINER = { konteyner_kodu: '', tur: 'kati_atik', mahalle_id: '', cavus_id: '', latitude: '', longitude: '', adres: '', kapasite_litre: '', yerlesim_notu: '', kurulum_tarihi: '', aktif_mi: true };
const createIcon = (container, selected = false) => {
  const color = container.aktif_mi === false ? '#64748b' : (healthColor[container.saglik_durumu] || '#64748b');
  const stateClass = container.gorev_gecikti_mi ? 'is-overdue' : container.aktif_gorev_id ? 'is-assigned' : '';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="container-map-marker ${stateClass} ${selected ? 'is-selected' : ''}" style="--marker-color:${color}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

function MapClickSelector({ enabled, onSelect }) {
  useMapEvents({ click: (event) => { if (enabled) onSelect(event.latlng); } });
  return null;
}

export default function AdminMap() {
  const [containers, setContainers] = useState([]);
  const [sergeants, setSergeants] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskForm, setTaskForm] = useState({ cavus_id: '', sofor_id: '', oncelik: 'normal', hedef_tarih: '', yonetici_notu: '', farkli_mahalle_onayi: false });
  const [ownerForm, setOwnerForm] = useState({ cavus_id: '', acik_gorevi_iptal_et: false, farkli_mahalle_onayi: false });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [createMode, setCreateMode] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CONTAINER);
  const [driverSearch, setDriverSearch] = useState('');
  const [detailTab, setDetailTab] = useState('general');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const deepLinkHandled = useRef(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [containerItems, sergeantItems, districtItems] = await Promise.all([
        fetchAllPages('/admin/konteynerler'),
        fetchAllPages('/admin/cavuslar'),
        fetchAllPages('/mahalleler'),
      ]);
      setContainers(containerItems);
      setSergeants(sergeantItems);
      setDistricts(districtItems);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Harita verileri yüklenemedi.'));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (deepLinkHandled.current || !containers.length) return;
    const id = Number(new URLSearchParams(window.location.search).get('konteyner'));
    const target = containers.find((item) => item.id === id);
    if (target) { deepLinkHandled.current = true; openDetails(target); }
  }, [containers]);

  const openAssignment = async (container) => {
    setDialog({ type: 'assign', container });
    setTaskForm({ cavus_id: String(container.cavus_id || ''), sofor_id: '', oncelik: 'normal', hedef_tarih: '', yonetici_notu: '', farkli_mahalle_onayi: false });
    setDrivers([]);
    setDriverSearch('');
    try {
      const response = await api.get(`/admin/konteynerler/${container.id}/uygun-soforler`);
      setDrivers(response.data.data.soforler || []);
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Uygun şoförler alınamadı.') });
    }
  };

  const openOwner = (container) => {
    setOwnerForm({ cavus_id: String(container.cavus_id || ''), acik_gorevi_iptal_et: false, farkli_mahalle_onayi: false });
    setDialog({ type: 'owner', container });
  };

  const openDetails = async (container) => {
    setDetailTab('general');
    setDialog({ type: 'details', container, loading: true });
    setTaskHistory([]);
    try {
      const [detailResponse, tasks] = await Promise.all([api.get(`/admin/konteynerler/${container.id}/detay`), fetchAllPages(`/admin/konteynerler/${container.id}/gorevler`)]);
      setTaskHistory(tasks);
      setDialog({ type: 'details', container: detailResponse.data.data, loading: false });
    }
    catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Görev geçmişi alınamadı.') }); }
  };

  const toggleSelected = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const openBulkAssignment = async () => {
    const first = containers.find((item) => selectedIds.includes(item.id));
    if (!first) return;
    setDialog({ type: 'bulk', container: first });
    setDriverSearch('');
    setTaskForm({ cavus_id: String(first.cavus_id || ''), sofor_id: '', oncelik: 'normal', hedef_tarih: '', yonetici_notu: '', farkli_mahalle_onayi: false });
    try { const response = await api.get(`/admin/konteynerler/${first.id}/uygun-soforler`); setDrivers(response.data.data.soforler || []); }
    catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError) }); }
  };

  const submitBulkTask = async () => {
    setBusy(true);
    try {
      await api.post('/admin/konteynerler/toplu-gorevler', {
        konteyner_ids: selectedIds, cavus_id: Number(taskForm.cavus_id), sofor_id: Number(taskForm.sofor_id), oncelik: taskForm.oncelik,
        hedef_tarih: taskForm.hedef_tarih ? new Date(taskForm.hedef_tarih).toISOString() : null,
        yonetici_notu: taskForm.yonetici_notu.trim() || undefined, farkli_mahalle_onayi: taskForm.farkli_mahalle_onayi,
      });
      setDialog(null); setSelectedIds([]); setBulkMode(false); setNotice({ type: 'success', text: 'Seçili konteynerler tek işlemde şoföre atandı.' }); await fetchData();
    } catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Toplu atama yapılamadı.') }); }
    finally { setBusy(false); }
  };

  const selectCreateLocation = (latlng) => {
    setCreateForm((current) => ({ ...current, latitude: latlng.lat.toFixed(7), longitude: latlng.lng.toFixed(7) }));
    setCreateMode(false); setDialog({ type: 'create' });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice({ type: 'error', text: 'Bu cihaz konum hizmetini desteklemiyor.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCreateForm((current) => ({ ...current, latitude: coords.latitude.toFixed(7), longitude: coords.longitude.toFixed(7) })),
      () => setNotice({ type: 'error', text: 'Konum alınamadı. Tarayıcı konum iznini kontrol edin.' }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  const submitCreate = async (nearApproved = false) => {
    setBusy(true);
    try {
      await api.post('/admin/konteynerler', { ...createForm, konteyner_kodu: createForm.konteyner_kodu.trim() || undefined, kurulum_tarihi: createForm.kurulum_tarihi || undefined, mahalle_id: Number(createForm.mahalle_id), cavus_id: createForm.cavus_id ? Number(createForm.cavus_id) : null,
        latitude: Number(createForm.latitude), longitude: Number(createForm.longitude), kapasite_litre: createForm.kapasite_litre ? Number(createForm.kapasite_litre) : undefined, yakin_konteyner_onayi: nearApproved });
      setDialog(null); setNotice({ type: 'success', text: 'Yeni konteyner haritaya eklendi.' }); await fetchData();
    } catch (requestError) {
      if (requestError.response?.status === 409 && !nearApproved && getApiErrorMessage(requestError).includes('Yaklaşık')) {
        setDialog({ type: 'create-near' });
      } else setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Konteyner eklenemedi.') });
    } finally { setBusy(false); }
  };

  const openEditContainer = (container) => {
    setCreateForm({ konteyner_kodu: container.konteyner_kodu, tur: container.tur, mahalle_id: String(container.mahalle_id), cavus_id: String(container.cavus_id || ''), latitude: container.latitude, longitude: container.longitude, adres: container.adres || '', kapasite_litre: container.kapasite_litre || '', yerlesim_notu: container.yerlesim_notu || '', kurulum_tarihi: container.kurulum_tarihi?.slice(0, 10) || '', aktif_mi: container.aktif_mi });
    setDialog({ type: 'edit', container });
  };

  const submitEdit = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/konteynerler/${dialog.container.id}`, { ...createForm, kurulum_tarihi: createForm.kurulum_tarihi || null, mahalle_id: Number(createForm.mahalle_id), cavus_id: createForm.cavus_id ? Number(createForm.cavus_id) : null,
        latitude: Number(createForm.latitude), longitude: Number(createForm.longitude), kapasite_litre: createForm.kapasite_litre ? Number(createForm.kapasite_litre) : null });
      setDialog(null); setNotice({ type: 'success', text: 'Konteyner bilgileri güncellendi.' }); await fetchData();
    } catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError) }); }
    finally { setBusy(false); }
  };

  const deactivateContainer = async (container) => {
    setBusy(true);
    try { await api.patch(`/admin/konteynerler/${container.id}/durum`, { aktif_mi: false }); setDialog(null); setNotice({ type: 'success', text: 'Konteyner pasife alındı; açık görevi varsa güvenli biçimde iptal edildi.' }); await fetchData(); }
    catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError) }); }
    finally { setBusy(false); }
  };

  const activateContainer = async (container) => {
    setBusy(true);
    try { await api.patch(`/admin/konteynerler/${container.id}/durum`, { aktif_mi: true }); setDialog(null); setNotice({ type: 'success', text: 'Konteyner yeniden aktifleştirildi.' }); await fetchData(); }
    catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError) }); }
    finally { setBusy(false); }
  };

  const deleteContainer = async (container) => {
    setBusy(true);
    try { await api.delete(`/admin/konteynerler/${container.id}`); setDialog(null); setNotice({ type: 'success', text: 'Uygun pasif konteyner kalıcı olarak silindi.' }); await fetchData(); }
    catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError) }); }
    finally { setBusy(false); }
  };

  const openQr = async (container) => {
    try {
      const url = `${window.location.origin}/admin/harita?konteyner=${container.id}`;
      const response = await api.get(`/admin/konteynerler/${container.id}/qr`, { params: { target: url } });
      setQrDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(response.data.data.svg)}`);
      setDialog({ type: 'qr', container });
    } catch { setNotice({ type: 'error', text: 'QR kod oluşturulamadı.' }); }
  };

  const selectedSergeant = sergeants.find((item) => item.id === Number(taskForm.cavus_id));
  const selectedOwner = sergeants.find((item) => item.id === Number(ownerForm.cavus_id));
  const differentTaskDistrict = Boolean(selectedSergeant && dialog?.container && selectedSergeant.mahalle_id !== dialog.container.mahalle_id);
  const differentOwnerDistrict = Boolean(selectedOwner && dialog?.container && selectedOwner.mahalle_id !== dialog.container.mahalle_id);
  const visibleDrivers = useMemo(() => {
    const query = driverSearch.trim().toLocaleLowerCase('tr-TR');
    return drivers.filter((item) => (!taskForm.cavus_id || item.cavus_id === Number(taskForm.cavus_id)) && (!query || item.ad_soyad?.toLocaleLowerCase('tr-TR').includes(query) || item.plaka?.toLocaleLowerCase('tr-TR').includes(query)));
  }, [drivers, taskForm.cavus_id, driverSearch]);

  const submitTask = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/konteynerler/${dialog.container.id}/gorevler`, {
        cavus_id: Number(taskForm.cavus_id), sofor_id: Number(taskForm.sofor_id), oncelik: taskForm.oncelik,
        hedef_tarih: taskForm.hedef_tarih ? new Date(taskForm.hedef_tarih).toISOString() : null,
        yonetici_notu: taskForm.yonetici_notu.trim() || undefined,
        farkli_mahalle_onayi: taskForm.farkli_mahalle_onayi,
      });
      setDialog(null);
      setNotice({ type: 'success', text: `${dialog.container.konteyner_kodu} görevi şoföre atandı.` });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Görev atanamadı.') });
    } finally { setBusy(false); }
  };

  const submitOwner = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/konteynerler/${dialog.container.id}/cavus`, {
        cavus_id: Number(ownerForm.cavus_id), acik_gorevi_iptal_et: ownerForm.acik_gorevi_iptal_et,
        farkli_mahalle_onayi: ownerForm.farkli_mahalle_onayi,
      });
      setDialog(null);
      setNotice({ type: 'success', text: 'Konteynerin sorumlu çavuşu güncellendi.' });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Sorumlu çavuş güncellenemedi.') });
    } finally { setBusy(false); }
  };

  const cancelTask = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/konteyner-gorevleri/${dialog.container.aktif_gorev_id}/iptal`, { iptal_nedeni: 'Harita üzerinden yönetici tarafından iptal edildi.' });
      setDialog(null);
      setNotice({ type: 'success', text: 'Açık görev iptal edildi.' });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Görev iptal edilemedi.') });
    } finally { setBusy(false); }
  };

  const taskValid = taskForm.cavus_id && taskForm.sofor_id && (!differentTaskDistrict || taskForm.farkli_mahalle_onayi);
  const ownerValid = ownerForm.cavus_id && (!differentOwnerDistrict || ownerForm.farkli_mahalle_onayi) && (!dialog?.container?.aktif_gorev_id || ownerForm.acik_gorevi_iptal_et || Number(ownerForm.cavus_id) === dialog.container.cavus_id);

  return (
    <DashboardLayout title="Konteyner Haritası">
      {notice && <div className={`map-notice ${notice.type}`} role="status">{notice.text}</div>}
      <div className="map-management-toolbar glass-panel">
        <Button size="sm" onClick={() => { setCreateForm({ ...EMPTY_CONTAINER }); setCreateMode(true); setBulkMode(false); setSelectedIds([]); }}>+ Konteyner Ekle</Button>
        <Button size="sm" variant={bulkMode ? 'primary' : 'outline'} onClick={() => { setBulkMode((value) => !value); setCreateMode(false); if (bulkMode) setSelectedIds([]); }}>Çoklu Seçim {selectedIds.length ? `(${selectedIds.length})` : ''}</Button>
        {selectedIds.length > 0 && <Button size="sm" onClick={openBulkAssignment}>Seçilenleri Ata</Button>}
        {(createMode || bulkMode) && <span className="map-mode-help">{createMode ? 'Yeni konteyner konumu için haritaya dokunun.' : 'Atanacak konteynerlere dokunun.'}</span>}
      </div>
      <div className="admin-map-container glass-panel">
        <div className="map-legend">
          <div className="legend-item"><span className="legend-color health-green"></span> Normal</div>
          <div className="legend-item"><span className="legend-color health-yellow"></span> Takip</div>
          <div className="legend-item"><span className="legend-color health-red"></span> Kritik</div>
          <div className="legend-item"><span className="legend-ring assigned"></span> Görevli</div>
          <div className="legend-item"><span className="legend-ring overdue"></span> Gecikmiş</div>
        </div>
        {loading ? <div className="map-loading">Harita yükleniyor…</div> : error ? <div className="map-loading"><p>{error}</p><Button variant="outline" onClick={fetchData}>Yeniden Dene</Button></div> : (
          <MapContainer center={[37.5858, 36.9145]} zoom={14} className="map-view">
            <MapBaseLayer placement="admin" />
            {createMode && <MapClickSelector enabled onSelect={selectCreateLocation} />}
            {containers.map((container) => container.latitude && container.longitude && (
              <Marker key={container.id} position={[container.latitude, container.longitude]} icon={createIcon(container, selectedIds.includes(container.id))} eventHandlers={{ click: () => { if (bulkMode) toggleSelected(container.id); } }} title={`${container.konteyner_kodu} konteyneri`} alt={`${container.konteyner_kodu} konteyneri`}>
                {!bulkMode && <Popup className="custom-popup admin-container-popup" minWidth={270} maxWidth={310}>
                  <div className="popup-content">
                    <div className="popup-heading"><strong>{container.konteyner_kodu}</strong><span className={`popup-type ${container.tur}`}>{typeLabel(container.tur)}</span></div>
                    <p className="popup-location">{container.mahalle_ad} Mahallesi</p>
                    <dl className="popup-summary">
                      <div><dt>Çavuş</dt><dd>{container.cavus_ad_soyad || 'Atanmamış'}</dd></div>
                      <div><dt>Aktif görev</dt><dd>{container.gorev_sofor_ad_soyad || 'Atanmamış'}</dd></div>
                      {container.gorev_arac_plaka && <div><dt>Araç</dt><dd>{container.gorev_arac_plaka}</dd></div>}
                      <div><dt>Son toplama</dt><dd>{container.son_toplanma_tarihi ? formatDate(container.son_toplanma_tarihi) : 'Hiç toplanmadı'}</dd></div>
                      <div><dt>Durum</dt><dd className={`health-text ${container.saglik_durumu}`}>{container.saglik_durumu === 'kirmizi' ? 'Kritik' : container.saglik_durumu === 'sari' ? 'Takip edilmeli' : 'Normal'}</dd></div>
                      <div><dt>Açık şikâyet</dt><dd>{container.acik_sikayet_sayisi || 0}</dd></div>
                    </dl>
                    {container.gorev_gecikti_mi && <div className="popup-alert">⚠ Görev gecikti</div>}
                    <div className="popup-actions">
                      <button type="button" className="primary" onClick={() => openAssignment(container)} disabled={!container.aktif_mi || Boolean(container.aktif_gorev_id)}>{container.aktif_gorev_id ? 'Görev Atanmış' : 'Görev Ata'}</button>
                      <button type="button" onClick={() => openOwner(container)}>Sorumlu</button>
                      <button type="button" onClick={() => openDetails(container)}>Detaylar</button>
                      <button type="button" onClick={() => openEditContainer(container)}>Düzenle</button>
                      <button type="button" onClick={() => openQr(container)}>QR Kod</button>
                      {container.aktif_mi ? <button type="button" onClick={() => setDialog({ type: 'deactivate', container })}>Pasife Al</button> : <button type="button" onClick={() => setDialog({ type: 'activate', container })}>Aktifleştir</button>}
                      {!container.aktif_mi && <button type="button" className="danger" onClick={() => setDialog({ type: 'delete-container', container, confirmation: '' })}>Kalıcı Sil</button>}
                    </div>
                  </div>
                </Popup>}
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      <ConfirmModal isOpen={dialog?.type === 'assign'} className="map-action-modal" backdropClassName="map-action-backdrop" title={`${dialog?.container?.konteyner_kodu || ''} Görev Ata`} message={`${typeLabel(dialog?.container?.tur)} · ${dialog?.container?.mahalle_ad || ''}`} variant="info" confirmText={busy ? 'Atanıyor…' : 'Görevi Ata'} confirmDisabled={busy || !taskValid} onConfirm={submitTask} onCancel={() => !busy && setDialog(null)}>
        <div className="map-task-form">
          <label>Sorumlu Çavuş<select value={taskForm.cavus_id} onChange={(event) => setTaskForm((current) => ({ ...current, cavus_id: event.target.value, sofor_id: '', farkli_mahalle_onayi: false }))}><option value="">Çavuş seçin</option>{sergeants.filter((item) => item.aktif_mi).map((item) => <option key={item.id} value={item.id}>{item.ad_soyad} · {item.mahalle_ad}{item.id === dialog?.container?.cavus_id ? ' — mevcut sorumlu' : ''}</option>)}</select></label>
          {differentTaskDistrict && <label className="map-confirm-check"><input type="checkbox" checked={taskForm.farkli_mahalle_onayi} onChange={(event) => setTaskForm((current) => ({ ...current, farkli_mahalle_onayi: event.target.checked }))} /><span><strong>Farklı mahalle sorumluluğu</strong> Bu konteyner {selectedSergeant?.mahalle_ad} sorumluluğundaki çavuşa aktarılacak.</span></label>}
          <fieldset className="driver-picker"><legend>Uygun Şoför</legend><input className="driver-search" type="search" value={driverSearch} onChange={(event) => setDriverSearch(event.target.value)} placeholder="Şoför veya plakayla ara" aria-label="Şoför ara" />{visibleDrivers.length === 0 ? <p>Aramaya uygun şoför bulunmuyor.</p> : visibleDrivers.map((driver) => <button type="button" key={driver.id} disabled={!driver.uygun_mi} className={String(driver.id) === taskForm.sofor_id ? 'selected' : ''} onClick={() => setTaskForm((current) => ({ ...current, sofor_id: String(driver.id) }))}><span><strong>{driver.ad_soyad}</strong><small>{driver.plaka || 'Araç yok'} · {driver.arac_turu ? typeLabel(driver.arac_turu) : 'Tür yok'}</small></span><span className="driver-workload">{driver.uygun_mi ? `${driver.acik_gorev_sayisi} açık görev` : driver.uygun_degil_nedeni}</span></button>)}</fieldset>
          <div className="map-task-grid"><label>Öncelik<select value={taskForm.oncelik} onChange={(event) => setTaskForm((current) => ({ ...current, oncelik: event.target.value }))}><option value="dusuk">Düşük</option><option value="normal">Normal</option><option value="yuksek">Yüksek</option><option value="acil">Acil</option></select></label><label>Hedef Zaman<input type="datetime-local" value={taskForm.hedef_tarih} onChange={(event) => setTaskForm((current) => ({ ...current, hedef_tarih: event.target.value }))} /></label></div>
          <label>Görev Notu<textarea rows="3" maxLength={2000} value={taskForm.yonetici_notu} onChange={(event) => setTaskForm((current) => ({ ...current, yonetici_notu: event.target.value }))} placeholder="Şoför için isteğe bağlı açıklama" /></label>
        </div>
      </ConfirmModal>

      <ConfirmModal isOpen={dialog?.type === 'owner'} className="map-action-modal map-action-compact" backdropClassName="map-action-backdrop" title="Sorumlu Çavuşu Değiştir" message={dialog?.container?.cavus_ad_soyad ? `Şu anda ${dialog.container.cavus_ad_soyad} çavuşuna bağlı.` : 'Bu konteynere henüz çavuş atanmamış.'} variant="warning" confirmText={busy ? 'Kaydediliyor…' : 'Sorumluyu Güncelle'} confirmDisabled={busy || !ownerValid} onConfirm={submitOwner} onCancel={() => !busy && setDialog(null)}>
        <div className="map-task-form"><label>Yeni Sorumlu<select value={ownerForm.cavus_id} onChange={(event) => setOwnerForm((current) => ({ ...current, cavus_id: event.target.value, farkli_mahalle_onayi: false }))}><option value="">Çavuş seçin</option>{sergeants.filter((item) => item.aktif_mi).map((item) => <option key={item.id} value={item.id}>{item.ad_soyad} · {item.mahalle_ad}{item.id === dialog?.container?.cavus_id ? ' — mevcut' : ''}</option>)}</select></label>{differentOwnerDistrict && <label className="map-confirm-check"><input type="checkbox" checked={ownerForm.farkli_mahalle_onayi} onChange={(event) => setOwnerForm((current) => ({ ...current, farkli_mahalle_onayi: event.target.checked }))} /><span>Farklı mahalleden sorumlu çavuşa aktarımı onaylıyorum.</span></label>}{dialog?.container?.aktif_gorev_id && Number(ownerForm.cavus_id) !== dialog.container.cavus_id && <label className="map-confirm-check danger"><input type="checkbox" checked={ownerForm.acik_gorevi_iptal_et} onChange={(event) => setOwnerForm((current) => ({ ...current, acik_gorevi_iptal_et: event.target.checked }))} /><span>Açık görevin iptal edileceğini onaylıyorum.</span></label>}</div>
      </ConfirmModal>

      <ConfirmModal isOpen={dialog?.type === 'details'} className="map-action-modal map-detail-sheet" backdropClassName="map-action-backdrop" title={`${dialog?.container?.konteyner_kodu || ''} Detayları`} variant="info" cancelText="" confirmText="Kapat" confirmDisabled={busy} onConfirm={() => setDialog(null)} onCancel={() => !busy && setDialog(null)}>
        {dialog?.type === 'details' && <div className="container-detail-panel">
          <div className="detail-owner"><span><small>Sorumlu çavuş</small><strong>{dialog?.container?.cavus_ad_soyad || 'Atanmamış'}</strong></span><span><small>Sağlık</small><strong className={`health-text ${dialog?.container?.saglik_durumu}`}>{dialog?.container?.saglik_durumu === 'kirmizi' ? 'Kritik' : dialog?.container?.saglik_durumu === 'sari' ? 'Takip' : 'Normal'}</strong></span><span><small>Açık şikâyet</small><strong>{dialog?.container?.acik_sikayet_sayisi || 0}</strong></span></div>
          <div className="detail-tabs" role="tablist" aria-label="Konteyner detay bölümleri">{[['general','Genel'],['task','Aktif Görev'],['collections','Toplama'],['complaints','Şikâyetler'],['timeline','İşlem Geçmişi']].map(([key,label]) => <button type="button" role="tab" aria-selected={detailTab === key} className={detailTab === key ? 'active' : ''} key={key} onClick={() => setDetailTab(key)}>{label}</button>)}</div>
          {dialog?.loading ? <p>Detaylar yükleniyor…</p> : <div className="detail-tab-content">
            {detailTab === 'general' && <dl className="detail-facts"><div><dt>Tür / Durum</dt><dd>{typeLabel(dialog.container.tur)} · {dialog.container.aktif_mi ? 'Aktif' : 'Pasif'}</dd></div><div><dt>Mahalle / Adres</dt><dd>{dialog.container.mahalle_ad} · {dialog.container.adres || 'Adres girilmemiş'}</dd></div><div><dt>Koordinat</dt><dd>{dialog.container.latitude}, {dialog.container.longitude}</dd></div><div><dt>Son toplama</dt><dd>{formatDate(dialog.container.son_toplanma_tarihi)}</dd></div><div><dt>Son 30 gün</dt><dd>{dialog.container.son_30_gun_toplama_sayisi || 0} toplama · {dialog.container.atlanma_sayisi || 0} atlama</dd></div><div><dt>Kayıt tarihleri</dt><dd>{formatDate(dialog.container.created_at)} · Güncelleme {formatDate(dialog.container.updated_at)}</dd></div></dl>}
            {detailTab === 'task' && <>{dialog.container.aktif_gorev_id ? <article className={new Date(dialog.container.hedef_tarih) < new Date() ? 'overdue' : ''}><div><strong>{dialog.container.gorev_sofor_ad_soyad}</strong><span>{priorityLabel[dialog.container.gorev_oncelik]}</span></div><p>Araç: {dialog.container.gorev_arac_plaka || '-'}</p><small>Hedef: {formatDate(dialog.container.hedef_tarih)}</small></article> : <p className="detail-empty">Açık görev bulunmuyor.</p>}{taskHistory.length > 0 && <><h4>Görev Geçmişi</h4>{taskHistory.map((task) => <article key={task.id} className={task.gecikti_mi ? 'overdue' : ''}><div><strong>{task.sofor_ad_soyad}</strong><span className={`task-status ${task.durum}`}>{statusLabel[task.durum]}</span></div><small>{task.plaka} · {formatDate(task.created_at)}</small></article>)}</>}</>}
            {detailTab === 'collections' && ((dialog.container.toplama_kayitlari || []).length ? dialog.container.toplama_kayitlari.map((entry) => <article key={entry.id}><div><strong>{entry.sofor_ad_soyad || 'Şoför'}</strong><span>{entry.durum === 'toplandi' ? 'Toplandı' : 'Atlandı'}</span></div><small>{formatDate(entry.tarih_saat)}{entry.sebep ? ` · ${entry.sebep}` : ''}{entry.kanit_fotografi_url ? ' · Fotoğraflı' : ''}{entry.latitude ? ' · Konumlu' : ''}</small></article>) : <p className="detail-empty">Toplama kaydı bulunmuyor.</p>)}
            {detailTab === 'complaints' && ((dialog.container.sikayetler || []).length ? dialog.container.sikayetler.map((item) => <article key={item.id}><div><strong>{item.sikayet_kategorisi}</strong><span>{item.durum}</span></div><p>{item.sikayet_metni}</p><small>{formatDate(item.tarih_saat)}</small></article>) : <p className="detail-empty">Şikâyet kaydı bulunmuyor.</p>)}
            {detailTab === 'timeline' && ((dialog.container.islem_gecmisi || []).length ? dialog.container.islem_gecmisi.map((event) => <article key={event.id}><strong>{event.summary}</strong><small>{event.actor_name || 'Sistem'} · {formatDate(event.created_at)}</small></article>) : <p className="detail-empty">İşlem geçmişi bulunmuyor.</p>)}
          </div>}
          <div className="detail-quick-actions"><Button size="sm" onClick={() => openAssignment(dialog.container)} disabled={!dialog.container?.aktif_mi || Boolean(dialog.container?.aktif_gorev_id)}>Görev Ata</Button><Button size="sm" variant="outline" onClick={() => openOwner(dialog.container)}>Sorumlu</Button><Button size="sm" variant="outline" onClick={() => openEditContainer(dialog.container)}>Düzenle</Button><Button size="sm" variant="outline" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${dialog.container.latitude},${dialog.container.longitude}`, '_blank', 'noopener,noreferrer')}>Yol Tarifi</Button><Button size="sm" variant="outline" onClick={() => openQr(dialog.container)}>QR</Button>{dialog.container?.aktif_gorev_id && <Button size="sm" variant="danger" onClick={cancelTask}>Görevi İptal Et</Button>}</div>
        </div>}
      </ConfirmModal>
      <ConfirmModal isOpen={['create', 'create-near', 'edit'].includes(dialog?.type)} className="map-action-modal" backdropClassName="map-action-backdrop" title={dialog?.type === 'edit' ? 'Konteyneri Düzenle' : 'Yeni Konteyner Ekle'} message={dialog?.type === 'create-near' ? 'Bu konuma çok yakın başka bir konteyner var. Yine de eklemek istiyor musunuz?' : 'Operasyon bilgilerini tamamlayın.'} variant={dialog?.type === 'create-near' ? 'warning' : 'info'} confirmText={busy ? 'Kaydediliyor…' : dialog?.type === 'create-near' ? 'Yakına Ekle' : 'Kaydet'} confirmDisabled={busy || !createForm.mahalle_id || !createForm.latitude || !createForm.longitude} onConfirm={dialog?.type === 'edit' ? submitEdit : () => submitCreate(dialog?.type === 'create-near')} onCancel={() => !busy && setDialog(null)}>
        <div className="map-task-form">
          <label>Konteyner Kodu <small>(boş bırakılırsa otomatik üretilir)</small><input maxLength="50" value={createForm.konteyner_kodu} onChange={(event) => setCreateForm((current) => ({ ...current, konteyner_kodu: event.target.value.toLocaleUpperCase('tr-TR') }))} placeholder="Otomatik" /></label>
          <div className="map-task-grid"><label>Tür<select value={createForm.tur} onChange={(event) => setCreateForm((current) => ({ ...current, tur: event.target.value }))}><option value="kati_atik">Katı Atık</option><option value="geri_donusum">Geri Dönüşüm</option></select></label><label>Kapasite (litre)<input type="number" min="30" max="10000" value={createForm.kapasite_litre} onChange={(event) => setCreateForm((current) => ({ ...current, kapasite_litre: event.target.value }))} /></label></div>
          <label>Mahalle<select value={createForm.mahalle_id} onChange={(event) => setCreateForm((current) => ({ ...current, mahalle_id: event.target.value, cavus_id: '' }))}><option value="">Mahalle seçin</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.ad}</option>)}</select></label>
          <label>Sorumlu Çavuş<select value={createForm.cavus_id} onChange={(event) => setCreateForm((current) => ({ ...current, cavus_id: event.target.value }))}><option value="">Daha sonra ata</option>{sergeants.filter((item) => item.aktif_mi && item.mahalle_id === Number(createForm.mahalle_id)).map((item) => <option key={item.id} value={item.id}>{item.ad_soyad}</option>)}</select></label>
          <label>Adres<input maxLength={1000} value={createForm.adres} onChange={(event) => setCreateForm((current) => ({ ...current, adres: event.target.value }))} /></label>
          <label>Yerleşim Notu<textarea rows="3" maxLength={2000} value={createForm.yerlesim_notu} onChange={(event) => setCreateForm((current) => ({ ...current, yerlesim_notu: event.target.value }))} /></label>
          <div className="map-task-grid"><label>Enlem<input inputMode="decimal" value={createForm.latitude} onChange={(event) => setCreateForm((current) => ({ ...current, latitude: event.target.value }))} /></label><label>Boylam<input inputMode="decimal" value={createForm.longitude} onChange={(event) => setCreateForm((current) => ({ ...current, longitude: event.target.value }))} /></label></div>
          <Button type="button" size="sm" variant="outline" onClick={useCurrentLocation}>Telefon GPS Konumunu Kullan</Button>
          <div className="map-task-grid"><label>Kurulum Tarihi<input type="date" value={createForm.kurulum_tarihi} onChange={(event) => setCreateForm((current) => ({ ...current, kurulum_tarihi: event.target.value }))} /></label><label>Durum<select value={createForm.aktif_mi ? 'active' : 'passive'} disabled={dialog?.type === 'edit'} onChange={(event) => setCreateForm((current) => ({ ...current, aktif_mi: event.target.value === 'active' }))}><option value="active">Aktif</option><option value="passive">Pasif</option></select></label></div>
        </div>
      </ConfirmModal>

      <ConfirmModal isOpen={dialog?.type === 'bulk'} className="map-action-modal" backdropClassName="map-action-backdrop" title={`${selectedIds.length} Konteyneri Toplu Ata`} message="Tüm seçimler aynı şoföre tek işlemde atanır; bir tanesi uygun değilse hiçbir kayıt oluşturulmaz." variant="info" confirmText={busy ? 'Atanıyor…' : 'Toplu Görev Ata'} confirmDisabled={busy || !taskValid} onConfirm={submitBulkTask} onCancel={() => !busy && setDialog(null)}>
        <div className="map-task-form"><label>Sorumlu Çavuş<select value={taskForm.cavus_id} onChange={(event) => setTaskForm((current) => ({ ...current, cavus_id: event.target.value, sofor_id: '' }))}><option value="">Çavuş seçin</option>{sergeants.filter((item) => item.aktif_mi).map((item) => <option key={item.id} value={item.id}>{item.ad_soyad} · {item.mahalle_ad}</option>)}</select></label><fieldset className="driver-picker"><legend>Uygun Şoför</legend><input className="driver-search" type="search" value={driverSearch} onChange={(event) => setDriverSearch(event.target.value)} placeholder="Şoför veya plakayla ara" />{visibleDrivers.map((driver) => <button type="button" key={driver.id} disabled={!driver.uygun_mi} className={String(driver.id) === taskForm.sofor_id ? 'selected' : ''} onClick={() => setTaskForm((current) => ({ ...current, sofor_id: String(driver.id) }))}><span><strong>{driver.ad_soyad}</strong><small>{driver.plaka || 'Araç yok'}</small></span><span>{driver.uygun_mi ? `${driver.acik_gorev_sayisi} açık görev` : driver.uygun_degil_nedeni}</span></button>)}</fieldset><div className="map-task-grid"><label>Öncelik<select value={taskForm.oncelik} onChange={(event) => setTaskForm((current) => ({ ...current, oncelik: event.target.value }))}><option value="normal">Normal</option><option value="yuksek">Yüksek</option><option value="acil">Acil</option></select></label><label>Hedef<input type="datetime-local" value={taskForm.hedef_tarih} onChange={(event) => setTaskForm((current) => ({ ...current, hedef_tarih: event.target.value }))} /></label></div></div>
      </ConfirmModal>
      <ConfirmModal isOpen={dialog?.type === 'deactivate'} title="Konteyneri Pasife Al" message="Konteyner pasife alınacak ve varsa açık görevi iptal edilecek. Devam edilsin mi?" variant="danger" confirmText={busy ? 'İşleniyor…' : 'Pasife Al'} confirmDisabled={busy} onConfirm={() => deactivateContainer(dialog.container)} onCancel={() => !busy && setDialog(null)} />
      <ConfirmModal isOpen={dialog?.type === 'activate'} title="Konteyneri Aktifleştir" message="Konteyner yeniden saha operasyonlarına açılacak." variant="success" confirmText={busy ? 'İşleniyor…' : 'Aktifleştir'} confirmDisabled={busy} onConfirm={() => activateContainer(dialog.container)} onCancel={() => !busy && setDialog(null)} />
      <ConfirmModal isOpen={dialog?.type === 'delete-container'} title="Konteyneri Kalıcı Sil" message="Yalnızca görev geçmişi bulunmayan pasif konteyner silinebilir. Onaylamak için konteyner kodunu yazın." variant="danger" confirmText={busy ? 'Siliniyor…' : 'Kalıcı Sil'} confirmDisabled={busy || dialog?.confirmation !== dialog?.container?.konteyner_kodu} onConfirm={() => deleteContainer(dialog.container)} onCancel={() => !busy && setDialog(null)}><label className="map-delete-confirm">Konteyner Kodu<input value={dialog?.confirmation || ''} onChange={(event) => setDialog((current) => ({ ...current, confirmation: event.target.value }))} autoComplete="off" /></label></ConfirmModal>
      <ConfirmModal isOpen={dialog?.type === 'qr'} title={`${dialog?.container?.konteyner_kodu || ''} QR Kodu`} message="Etikete basıldığında bu konteyner kaydına yönlendirir." variant="info" confirmText="Kapat" onConfirm={() => setDialog(null)} onCancel={() => setDialog(null)}><div className="container-qr">{qrDataUrl && <img src={qrDataUrl} alt={`${dialog?.container?.konteyner_kodu} QR kodu`} />}<a href={qrDataUrl} download={`${dialog?.container?.konteyner_kodu || 'konteyner'}-qr.png`}>QR Kodu İndir</a></div></ConfirmModal>
    </DashboardLayout>
  );
}
