import React, { useState } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ConfirmModal from '../../components/ConfirmModal';
import MapBaseLayer from '../../components/maps/MapBaseLayer';
import { PlusCircle, FileText, CheckCircle, Clock, XCircle, Edit, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './SirketDashboard.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPages } from '../../services/pagination';
import { ContentState } from '../../components/AppState';

const DEFAULT_MAP_CENTER = [37.5858, 36.9145];

const createRecyclingIcon = (selected) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: ${selected ? '#f59e0b' : '#10b981'}; width: 100%; height: 100%; border-radius: 50%; border: ${selected ? '4px' : '2px'} solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: selected ? [26, 26] : [20, 20],
  iconAnchor: selected ? [13, 13] : [10, 10],
});

const SirketDashboard = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTalep, setEditingTalep] = useState(null);
  const queryKey = ['sirket', 'geri-donusum-talepleri'];
  const { data: talepler = [], isPending: loading, isError, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchAllPages('/sirket/geri-donusum-talepleri', { signal }),
  });
  const {
    data: recyclingContainers = [],
    isPending: containersLoading,
    isError: containersError,
    refetch: refetchContainers,
  } = useQuery({
    queryKey: ['public', 'recycling-containers'],
    queryFn: ({ signal }) => fetchAllPages('/konteynerler', {
      params: { tur: 'geri_donusum', aktif_mi: true },
      signal,
    }),
    enabled: formOpen,
    staleTime: 5 * 60 * 1000,
  });
  const [formData, setFormData] = useState({
    talep_basligi: '',
    talep_aciklamasi: '',
    tahmini_miktar: '',
    adres: '',
    konteyner_id: '',
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'warning' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateForm = () => {
    setEditingTalep(null);
    setFormData({ talep_basligi: '', talep_aciklamasi: '', tahmini_miktar: '', adres: '', konteyner_id: '' });
    setFormOpen(true);
  };

  const openEditForm = (talep) => {
    setEditingTalep(talep);
    setFormData({
      talep_basligi: talep.talep_basligi || '',
      talep_aciklamasi: talep.talep_aciklamasi || '',
      tahmini_miktar: talep.tahmini_miktar || '',
      adres: talep.adres || '',
      konteyner_id: talep.konteyner_id ? String(talep.konteyner_id) : '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (formData.tahmini_miktar !== '') {
        payload.tahmini_miktar = Number(formData.tahmini_miktar);
      } else {
        delete payload.tahmini_miktar;
      }

      const selectedContainerId = formData.konteyner_id === '' ? null : Number(formData.konteyner_id);
      if (editingTalep) {
        const previousContainerId = editingTalep.konteyner_id ? Number(editingTalep.konteyner_id) : null;
        if (selectedContainerId !== previousContainerId) payload.konteyner_id = selectedContainerId;
        else delete payload.konteyner_id;
      } else if (selectedContainerId === null) {
        delete payload.konteyner_id;
      } else {
        payload.konteyner_id = selectedContainerId;
      }

      if (editingTalep) {
        await api.put(`/sirket/geri-donusum-talepleri/${editingTalep.id}`, payload);
      } else {
        await api.post('/sirket/geri-donusum-talepleri', payload);
      }

      setFormOpen(false);
      setEditingTalep(null);
      setFormData({ talep_basligi: '', talep_aciklamasi: '', tahmini_miktar: '', adres: '', konteyner_id: '' });
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      alert("İşlem gerçekleştirilemedi: " + (err.response?.data?.message || err.message));
    }
  };

  const promptCancelTalep = (id, baslik) => {
    setConfirmModal({
      isOpen: true,
      title: "Talebi İptal Et",
      message: `"${baslik}" başlıklı geri dönüşüm talebinizi iptal etmek istediğinize emin misiniz?`,
      variant: "danger",
      confirmText: "Evet, İptal Et",
      onConfirm: async () => {
        try {
          await api.patch(`/sirket/geri-donusum-talepleri/${id}/cancel`);
          queryClient.setQueryData(queryKey, (previous = []) => previous.map(t => t.id === id ? { ...t, durum: 'iptal_edildi' } : t));
          setConfirmModal({ isOpen: false });
        } catch {
          alert("Talep iptal edilemedi.");
        }
      }
    });
  };

  const formatDate = (val) => {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusIcon = (durum) => {
    switch (durum) {
      case 'onaylandi': return <CheckCircle size={18} className="text-success" />;
      case 'bekliyor': return <Clock size={18} className="text-warning" />;
      case 'reddedildi': return <XCircle size={18} className="text-danger" />;
      case 'iptal_edildi': return <XCircle size={18} className="text-muted" />;
      default: return <FileText size={18} className="text-muted" />;
    }
  };

  const getStatusLabel = (durum) => {
    const map = {
      'bekliyor': 'Bekliyor (Düzenlenebilir)',
      'onaylandi': 'Belediye Onayladı',
      'reddedildi': 'Reddedildi',
      'tamamlandi': 'Tamamlandı',
      'iptal_edildi': 'İptal Edildi'
    };
    return map[durum] || durum;
  };

  const selectedContainer = recyclingContainers.find(
    (container) => String(container.id) === String(formData.konteyner_id)
  );
  const mapCenter = selectedContainer
    ? [selectedContainer.latitude, selectedContainer.longitude]
    : DEFAULT_MAP_CENTER;
  const missingEditedContainer = editingTalep?.konteyner_id
    && !recyclingContainers.some((container) => String(container.id) === String(editingTalep.konteyner_id));

  if (loading) return <DashboardLayout title="Taleplerim"><div className="skeleton" style={{ minHeight: 220 }} /></DashboardLayout>;
  if (isError) return <DashboardLayout title="Taleplerim"><ContentState type="error" title="Talepler yüklenemedi" message="Bağlantınızı kontrol edip yeniden deneyin." onRetry={refetch} /></DashboardLayout>;

  return (
    <DashboardLayout title="Geri Dönüşüm Talepleri">
      <div className="sirket-dashboard">
        
        <div className="flex-between mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title">Geçmiş Geri Dönüşüm Talepleriniz</h3>
          <Button variant="primary" onClick={openCreateForm}>
            <PlusCircle size={18} /> Yeni Talep Oluştur
          </Button>
        </div>

        {formOpen && (
          <div className="glass-panel p-4 mb-4 animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h4 className="mb-4" style={{ marginTop: 0, fontSize: '1.1rem' }}>
              {editingTalep ? 'Talebi Düzenle' : 'Yeni Geri Dönüşüm Talebi'}
            </h4>
            <form onSubmit={handleSubmit} className="talep-form">
              <Input label="Talep Başlığı" name="talep_basligi" value={formData.talep_basligi} onChange={handleInputChange} required />
              <Input label="Tahmini Miktar (kg)" type="number" step="0.1" name="tahmini_miktar" value={formData.tahmini_miktar} onChange={handleInputChange} required />
              <div className="form-group" style={{gridColumn: '1 / -1'}}>
                <label className="input-label" htmlFor="request-description">Açıklama</label>
                <textarea id="request-description" className="custom-textarea" name="talep_aciklamasi" value={formData.talep_aciklamasi} onChange={handleInputChange} required style={{ width: '100%', minHeight: '70px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div className="form-group" style={{gridColumn: '1 / -1'}}>
                <label className="input-label" htmlFor="request-address">Adres</label>
                <textarea id="request-address" className="custom-textarea" name="adres" value={formData.adres} onChange={handleInputChange} required style={{ width: '100%', minHeight: '70px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div className="company-map-field">
                <div className="company-map-heading">
                  <div>
                    <label className="input-label" htmlFor="request-container">Geri Dönüşüm Konteyneri (Opsiyonel)</label>
                    <p>Haritadaki aktif bir geri dönüşüm konteynerini seçerek talebinizi konumla ilişkilendirebilirsiniz.</p>
                  </div>
                  {selectedContainer && (
                    <span className="selected-container-label">
                      <MapPin size={15} /> {selectedContainer.konteyner_kodu}
                    </span>
                  )}
                </div>

                {containersLoading ? (
                  <div className="company-map-skeleton skeleton" aria-label="Harita yükleniyor" />
                ) : containersError ? (
                  <div className="company-map-error" role="alert">
                    Konteyner haritası yüklenemedi.
                    <Button type="button" variant="outline" size="sm" onClick={() => refetchContainers()}>Yeniden Dene</Button>
                  </div>
                ) : (
                  <div className="company-map-wrapper">
                    <MapContainer center={mapCenter} zoom={selectedContainer ? 16 : 13} className="company-request-map">
                      <MapBaseLayer />
                      {recyclingContainers.map((container) => {
                        const selected = String(container.id) === String(formData.konteyner_id);
                        return (
                          <Marker
                            key={container.id}
                            position={[container.latitude, container.longitude]}
                            icon={createRecyclingIcon(selected)}
                            title={`${container.konteyner_kodu} geri dönüşüm konteyneri`}
                            alt={`${container.konteyner_kodu} geri dönüşüm konteyneri`}
                            eventHandlers={{
                              click: () => setFormData((previous) => ({ ...previous, konteyner_id: String(container.id) })),
                            }}
                          >
                            <Popup>
                              <strong>{container.konteyner_kodu}</strong><br />
                              <span>{container.mahalle_ad} Mahallesi</span>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                )}

                <select
                  id="request-container"
                  className="custom-select"
                  name="konteyner_id"
                  value={formData.konteyner_id}
                  onChange={handleInputChange}
                >
                  <option value="">Konteyner seçmeden devam et</option>
                  {missingEditedContainer && (
                    <option value={String(editingTalep.konteyner_id)}>
                      {editingTalep.konteyner_kodu || `Konteyner #${editingTalep.konteyner_id}`} (artık aktif değil)
                    </option>
                  )}
                  {recyclingContainers.map((container) => (
                    <option key={container.id} value={String(container.id)}>
                      {container.konteyner_kodu} - {container.mahalle_ad}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions" style={{gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem'}}>
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>İptal</Button>
                <Button type="submit" variant="primary">{editingTalep ? 'Değişiklikleri Kaydet' : 'Talebi Gönder'}</Button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table className="custom-table responsive-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>Talep Başlığı</th>
                <th style={{ padding: '0.75rem' }}>Miktar (kg)</th>
                <th style={{ padding: '0.75rem' }}>Tarih</th>
                <th style={{ padding: '0.75rem' }}>Durum</th>
                <th style={{ padding: '0.75rem', width: '180px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {talepler.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Henüz talep bulunmuyor.</td></tr>
              ) : (
                talepler.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td data-label="Talep Başlığı" className="font-medium" style={{ padding: '0.75rem', fontWeight: 600 }}>{t.talep_basligi}</td>
                    <td data-label="Miktar">{t.tahmini_miktar ? `${t.tahmini_miktar} kg` : '-'}</td>
                    <td data-label="Tarih" className="text-muted" style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(t.tarih_saat || t.created_at || t.olusturulma_tarihi)}</td>
                    <td data-label="Durum" style={{ padding: '0.75rem' }}>
                      <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {getStatusIcon(t.durum)} <span>{getStatusLabel(t.durum)}</span>
                      </div>
                    </td>
                    <td data-label="İşlemler" style={{ padding: '0.75rem' }}>
                      {t.durum === 'bekliyor' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button size="sm" variant="outline" onClick={() => openEditForm(t)} title="Düzenle">
                            <Edit size={14} /> Düzenle
                          </Button>
                          <Button size="sm" variant="outline" className="text-danger border-danger" onClick={() => promptCancelTalep(t.id, t.talep_basligi)} title="İptal Et">
                            İptal
                          </Button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {t.durum === 'onaylandi' ? 'Kilitli (Onaylandı)' : 'İşlem Kapalı'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </DashboardLayout>
  );
};

export default SirketDashboard;
