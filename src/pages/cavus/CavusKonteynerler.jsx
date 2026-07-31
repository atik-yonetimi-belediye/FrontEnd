import React, { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import { MapPin, Navigation, Clock, Trash2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './CavusKonteynerler.css';

const createIcon = (type) => {
  const color = type === 'geri_donusum' ? '#10b981' : '#3b82f6';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={createIcon('kati_atik')} />
  );
};

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

const CavusKonteynerler = () => {
  const [konteynerler, setKonteynerler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Container Form State
  const [position, setPosition] = useState(null);
  const [tur, setTur] = useState('kati_atik');
  const [isAdding, setIsAdding] = useState(false);

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedKodu, setSelectedKodu] = useState('');
  const historyDialogRef = useRef(null);

  // Delete Confirm Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetContainerId, setTargetContainerId] = useState(null);

  // Map view control
  const defaultCenter = [37.5858, 36.9145];
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    fetchKonteynerler();
  }, []);

  useEffect(() => {
    if (!historyModalOpen) return undefined;
    const previousActiveElement = document.activeElement;
    historyDialogRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setHistoryModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus?.();
    };
  }, [historyModalOpen]);

  const fetchKonteynerler = async () => {
    try {
      const res = await api.get('/cavus/konteynerler', { params: { limit: 200 } });
      if (res.data.success) {
        setKonteynerler(res.data.data);
      }
    } catch (err) {
      console.error("Konteynerler getirilemedi", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(16);
      }, () => {
        alert("Konum alınamadı. Lütfen tarayıcı izinlerini kontrol edin.");
      });
    } else {
      alert("Tarayıcınız konum özelliğini desteklemiyor.");
    }
  };

  const handleAddContainer = async () => {
    if (!position) return alert("Lütfen haritadan konum seçin veya GPS butonunu kullanın.");
    
    setIsAdding(true);
    try {
      const res = await api.post('/cavus/konteynerler', {
        tur,
        latitude: position.lat,
        longitude: position.lng
      });
      if (res.data.success) {
        setKonteynerler(prev => [...prev, res.data.data]);
        setPosition(null); // reset form
        alert("Konteyner başarıyla eklendi!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Konteyner eklenirken hata oluştu.");
    } finally {
      setIsAdding(false);
    }
  };

  const promptPassive = (id) => {
    setTargetContainerId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmPassive = async () => {
    if (!targetContainerId) return;
    try {
      await api.patch(`/cavus/konteynerler/${targetContainerId}/passive`);
      setKonteynerler(prev => prev.filter(k => k.id !== targetContainerId));
      setDeleteConfirmOpen(false);
      setTargetContainerId(null);
    } catch {
      alert("İşlem başarısız.");
    }
  };

  const handleViewHistory = async (konteynerId, kodu) => {
    setSelectedKodu(kodu);
    try {
      const res = await api.get('/cavus/toplama-kayitlari', { params: { limit: 200 } });
      if (res.data.success) {
        const records = res.data.data.filter(r => String(r.konteyner_id) === String(konteynerId));
        setSelectedHistory(records);
        setHistoryModalOpen(true);
      }
    } catch {
      alert("Toplama geçmişi yüklenemedi.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Hiç toplanmadı";
    const d = new Date(dateString);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  if (loading) {
    return (
      <DashboardLayout title="Konteyner Yönetimi">
        <div className="cavus-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginTop: '1rem' }}>
          <div className="map-section glass-panel" style={{ height: '480px', padding: '1rem' }}>
            <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="list-section">
            <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', height: '65px', display: 'flex', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: '80%', height: '24px' }} />
            </div>
            {[1, 2].map(n => (
              <div key={n} className="konteyner-card glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem', height: '135px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="skeleton skeleton-title" style={{ width: '45%', height: '16px', margin: 0 }} />
                  <div className="skeleton" style={{ width: '75px', height: '20px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton skeleton-text" style={{ width: '75%', height: '12px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '90%', height: '12px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '60%', height: '12px' }} />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Konteyner Yönetimi">
      <div className="cavus-konteynerler">
        
        {/* Ekleme Alanı */}
        <div className="glass-panel add-container-section mb-4">
          <h3>Yeni Konteyner Ekle</h3>
          <p className="text-muted mb-4">Haritaya tıklayarak veya GPS butonunu kullanarak konteynerin konumunu belirleyin.</p>
          
          <div className="map-wrapper mb-4">
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '320px', width: '100%', borderRadius: 'var(--radius-md)' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <MapController center={mapCenter} zoom={mapZoom} />
              <LocationMarker position={position} setPosition={setPosition} />
              
              {/* Existing Containers */}
              {konteynerler.map(k => (
                <Marker 
                  key={k.id} 
                  position={[k.latitude, k.longitude]} 
                  icon={createIcon(k.tur)} 
                />
              ))}
            </MapContainer>
            
            <div className="map-controls">
              <Button onClick={handleGetLocation} variant="outline" size="sm" className="bg-white">
                <Navigation size={16} /> Konumumu Al
              </Button>
            </div>
          </div>

          <div className="add-form-grid">
            <div className="form-group">
              <label>Konteyner Türü</label>
              <select className="custom-select" value={tur} onChange={(e) => setTur(e.target.value)}>
                <option value="kati_atik">Katı Atık</option>
                <option value="geri_donusum">Geri Dönüşüm</option>
              </select>
            </div>
            
            <div className="form-group" style={{display: 'flex', alignItems: 'flex-end'}}>
              <Button variant="primary" onClick={handleAddContainer} disabled={!position || isAdding} className="w-full">
                {isAdding ? 'Ekleniyor...' : 'Seçili Konuma Konteyner Ekle'}
              </Button>
            </div>
          </div>
          {!position && <p className="text-danger mt-2" style={{fontSize: '0.875rem'}}>* Ekleme yapmak için haritadan konum seçmelisiniz.</p>}
        </div>

        {/* Liste */}
        <h3>Bölgemdeki Konteynerler ({konteynerler.length})</h3>
        <div className="konteyner-list mt-4">
          {konteynerler.length === 0 ? (
            <p className="text-muted">Henüz konteyner bulunmuyor.</p>
          ) : (
            konteynerler.map(k => (
              <div key={k.id} className="konteyner-card glass-panel">
                <div className="k-header">
                  <div>
                    <h4>{k.konteyner_kodu}</h4>
                    <span className="badge">{k.tur === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık'}</span>
                  </div>
                  <Button variant="ghost" className="text-danger" onClick={() => promptPassive(k.id)} title="Pasif Yap">
                    <Trash2 size={18} />
                  </Button>
                </div>
                <div className="k-body">
                  <p><MapPin size={16} className="text-muted"/> {k.mahalle_ad}</p>
                  <p className="k-time" title="Son Toplanma Tarihi" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} className="text-primary"/> 
                    <span>{formatDate(k.son_toplanma_tarihi)}</span>
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setMapCenter([k.latitude, k.longitude]);
                        setMapZoom(16);
                        document.querySelector('.map-wrapper')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      <MapPin size={14} /> Harita Üzerinde Göster
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewHistory(k.id, k.konteyner_kodu)} style={{ width: '100%', fontSize: '0.85rem' }}>
                      Toplama Geçmişi
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Konteyneri Pasif Yap"
        message="Bu konteyneri pasif hale getirmek istediğinize emin misiniz?"
        variant="danger"
        confirmText="Evet, Pasif Yap"
        onConfirm={confirmPassive}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTargetContainerId(null);
        }}
      />

      {/* History Modal */}
      {historyModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }} 
          onClick={() => setHistoryModalOpen(false)}
        >
          <div
            ref={historyDialogRef}
            className="glass-panel animate-fade-in"
            style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-dialog-title"
            tabIndex={-1}
          >
            <h3 id="history-dialog-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: 0 }}>{selectedKodu} Toplama Geçmişi</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', textAlign: 'left', marginTop: '1rem' }}>
              {selectedHistory.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: '1.5rem 0' }}>Toplama kaydı bulunmuyor.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0', fontSize: '0.85rem', fontWeight: 600 }}>Tarih</th>
                      <th style={{ padding: '0.5rem 0', fontSize: '0.85rem', fontWeight: 600 }}>Şoför</th>
                      <th style={{ padding: '0.5rem 0', fontSize: '0.85rem', fontWeight: 600 }}>Durum</th>
                      <th style={{ padding: '0.5rem 0', fontSize: '0.85rem', fontWeight: 600 }}>Açıklama / Sebep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistory.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{new Date(r.tarih_saat).toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{r.sofor_ad_soyad || 'Bilinmiyor'}</td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.85rem' }}>
                          <span className={`status-badge ${r.durum}`} style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', backgroundColor: r.durum === 'toplandi' ? '#10b981' : '#ef4444' }}>
                            {r.durum === 'toplandi' ? 'Toplandı' : 'Atlandı'}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.sebep ? `${r.sebep}${r.diger_aciklama ? ` (${r.diger_aciklama})` : ''}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Button variant="primary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => setHistoryModalOpen(false)}>Kapat</Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CavusKonteynerler;
