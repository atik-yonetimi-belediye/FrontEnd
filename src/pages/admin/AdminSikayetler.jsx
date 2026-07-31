import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api, { resolveAssetUrl } from '../../services/api';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import LightboxModal from '../../components/LightboxModal';
import { useToast } from '../../components/useToast';
import { CheckCircle, Clock, MapPin, Search, Trash2, Map, Eye } from 'lucide-react';
import './AdminSikayetler.css';

const kategoriLabels = {
  konteyner_dolu: 'Konteyner Dolu / Taştı',
  konteyner_kirik: 'Konteyner Kırık / Hasarlı',
  kotu_koku: 'Kötü Koku',
  cop_tasmasi: 'Çöp Taşması',
  zamaninda_toplanmadi: 'Zamanında Toplanmadı',
  diger: 'Diğer'
};

const AdminSikayetler = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sikayetler, setSikayetler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDurum, setFilterDurum] = useState('hepsi');
  const [filterTur, setFilterTur] = useState('hepsi');
  const [filterKategori, setFilterKategori] = useState('hepsi');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'warning' });
  const [lightbox, setLightbox] = useState({ isOpen: false, images: [], index: 0 });

  const fetchSikayetler = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDurum !== 'hepsi') params.durum = filterDurum;
      if (filterTur !== 'hepsi') params.sikayet_turu = filterTur;
      if (filterKategori !== 'hepsi') params.sikayet_kategorisi = filterKategori;
      params.limit = 200;

      const res = await api.get('/sikayetler', { params });
      if (res.data.success) {
        setSikayetler(res.data.data);
      }
    } catch (err) {
      console.error("Şikayetler yüklenemedi", err);
    } finally {
      setLoading(false);
    }
  }, [filterDurum, filterTur, filterKategori]);

  useEffect(() => {
    fetchSikayetler();
  }, [fetchSikayetler]);

  const promptUpdateDurum = (id, yeniDurum) => {
    const durumIsimleri = {
      inceleniyor: 'İnceleniyor',
      cozuldu: 'Çözüldü',
      reddedildi: 'Reddedildi'
    };

    setConfirmModal({
      isOpen: true,
      title: "Şikayet Durumu Güncelleme",
      message: `Şikayet durumunu "${durumIsimleri[yeniDurum]}" olarak değiştirmek istediğinize emin misiniz?`,
      variant: yeniDurum === 'reddedildi' ? 'danger' : 'info',
      onConfirm: async () => {
        try {
          const res = await api.patch(`/sikayetler/${id}/durum`, { durum: yeniDurum });
          if (res.data.success) {
            setSikayetler(prev => prev.map(s => s.id === id ? { ...s, durum: yeniDurum } : s));
            showToast(`Şikayet durumu "${durumIsimleri[yeniDurum]}" olarak güncellendi.`, 'success');
            setConfirmModal({ isOpen: false });
          }
        } catch {
          showToast("Durum güncellenirken hata oluştu.", "error");
        }
      }
    });
  };

  const promptDeleteSikayet = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Şikâyeti Arşivle",
      message: "Bu şikâyeti aktif listeden kaldırıp arşivlemek istediğinize emin misiniz? İlişkili fotoğraflar silinecektir.",
      variant: "danger",
      confirmText: "Evet, Arşivle",
      onConfirm: async () => {
        try {
          await api.delete(`/sikayetler/${id}`);
          setSikayetler(prev => prev.filter(s => s.id !== id));
          showToast("Şikâyet arşivlendi.", "info");
          setConfirmModal({ isOpen: false });
        } catch {
          showToast("Şikayet silinirken hata oluştu.", "error");
        }
      }
    });
  };

  const openLightbox = (fotograflar, index = 0) => {
    const imageUrls = fotograflar.map(f => {
      const url = f.foto_url || f;
      return resolveAssetUrl(url);
    });
    setLightbox({ isOpen: true, images: imageUrls, index });
  };

  const filteredSikayetler = sikayetler.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.vatandas_ad_soyad?.toLowerCase().includes(q) ||
      s.vatandas_telefon?.includes(q) ||
      s.sikayet_metni?.toLowerCase().includes(q) ||
      s.konteyner_kodu?.toLowerCase().includes(q) ||
      s.mahalle_ad?.toLowerCase().includes(q)
    );
  });

  const exportToCSV = () => {
    const headers = ["ID,Vatandas,Telefon,Kategori,Metin,Durum,Tarih"];
    const rows = filteredSikayetler.map(s => 
      `${s.id},"${s.vatandas_ad_soyad}","${s.vatandas_telefon}","${kategoriLabels[s.sikayet_kategorisi] || s.sikayet_kategorisi}","${s.sikayet_metni.replace(/"/g, '""')}","${s.durum}","${new Date(s.tarih_saat || s.created_at).toLocaleString('tr-TR')}"`
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sikayetler.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <DashboardLayout title="Vatandaş Şikayetleri">
        <div className="admin-sikayetler">
          <div className="filter-bar glass-panel mb-4" style={{ height: '65px', padding: '1rem', display: 'flex', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '220px', height: '35px' }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vatandaş Şikayetleri">
      <div className="admin-sikayetler">
        
        {/* Filter & Search Bar */}
        <div className="filter-bar glass-panel mb-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Şikayetlerde ara (Ad, tel, metin...)" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="custom-input"
                style={{ paddingLeft: '2.25rem', width: '220px', height: '38px', fontSize: '0.85rem' }}
              />
            </div>
            
            <select value={filterDurum} onChange={(e) => setFilterDurum(e.target.value)} className="custom-select" style={{width: 'auto'}}>
              <option value="hepsi">Tüm Durumlar</option>
              <option value="bekliyor">Bekliyor (Yeni)</option>
              <option value="inceleniyor">İnceleniyor</option>
              <option value="cozuldu">Çözüldü</option>
              <option value="reddedildi">Reddedildi</option>
            </select>

            <select value={filterTur} onChange={(e) => setFilterTur(e.target.value)} className="custom-select" style={{width: 'auto'}}>
              <option value="hepsi">Tüm Atık Türleri</option>
              <option value="kati_atik">Katı Atık</option>
              <option value="geri_donusum">Geri Dönüşüm</option>
            </select>

            <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="custom-select" style={{width: 'auto'}}>
              <option value="hepsi">Tüm Kategoriler</option>
              {Object.keys(kategoriLabels).map(key => (
                <option key={key} value={key}>{kategoriLabels[key]}</option>
              ))}
            </select>
          </div>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <Button size="sm" variant="outline" onClick={exportToCSV}>Excel'e Aktar (CSV)</Button>
            <div className="stats-badge" style={{ backgroundColor: 'var(--primary-light)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontWeight: 'bold' }}>
              Toplam: {filteredSikayetler.length} Kayıt
            </div>
          </div>
        </div>

        <div className="sikayet-list">
          {filteredSikayetler.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Bu kriterlere uygun şikayet bulunamadı.</p>
          ) : (
            filteredSikayetler.map(s => (
              <div key={s.id} className={`sikayet-card glass-panel status-${s.durum}`}>
                <div className="s-header">
                  <div>
                    <h4>{s.vatandas_ad_soyad}</h4>
                    <p className="text-muted text-sm">{s.vatandas_telefon}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`status-badge ${s.durum}`}>{s.durum.toUpperCase()}</span>
                    <Button variant="ghost" className="text-danger" onClick={() => promptDeleteSikayet(s.id)} title="Şikayeti Sil">
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
                
                <div className="s-body">
                  <p className="s-konu" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    Kategori: {kategoriLabels[s.sikayet_kategorisi] || s.sikayet_kategorisi || 'Belirtilmemiş'}
                  </p>
                  <p className="s-detay" style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>{s.sikayet_metni}</p>
                  
                  {s.konteyner_id && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div className="s-konteyner text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}>
                        <MapPin size={14} /> 
                        <span>Konteyner: {s.konteyner_kodu} ({s.mahalle_ad} Mah.)</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate('/admin/harita')}
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                      >
                        <Map size={14} /> Haritada Göster
                      </Button>
                    </div>
                  )}
                  
                  {s.fotograflar && s.fotograflar.length > 0 && (
                    <div className="s-photos" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      {s.fotograflar.map((fotoObj, idx) => {
                        const url = fotoObj.foto_url || fotoObj;
                        if (!url || typeof url !== 'string') return null;
                        
                        const imgSrc = resolveAssetUrl(url);
                        return (
                          <div key={idx} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => openLightbox(s.fotograflar, idx)}>
                            <img 
                              src={imgSrc} 
                              alt={`Şikayet Foto ${idx+1}`} 
                              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', transition: 'transform 0.2s' }}
                              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                            <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', padding: '2px' }}>
                              <Eye size={12} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="s-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="s-date text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> {new Date(s.tarih_saat || s.created_at).toLocaleString('tr-TR')}
                  </span>
                  
                  <div className="s-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    {s.durum === 'bekliyor' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                        onClick={() => promptUpdateDurum(s.id, 'inceleniyor')}
                      >
                        İnceleniyor
                      </Button>
                    )}
                    {s.durum === 'inceleniyor' && (
                      <Button size="sm" variant="primary" onClick={() => promptUpdateDurum(s.id, 'cozuldu')}>
                        <CheckCircle size={14} /> Çözüldü
                      </Button>
                    )}
                    {(s.durum === 'bekliyor' || s.durum === 'inceleniyor') && (
                      <Button size="sm" variant="outline" className="text-danger border-danger" onClick={() => promptUpdateDurum(s.id, 'reddedildi')}>
                        Reddet
                      </Button>
                    )}
                    {(s.durum === 'cozuldu' || s.durum === 'reddedildi') && (
                      <Button size="sm" variant="outline" onClick={() => promptUpdateDurum(s.id, 'inceleniyor')}>
                        Yeniden İncele
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lightbox Gallery Modal */}
      {lightbox.isOpen && (
        <LightboxModal 
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox({ isOpen: false, images: [], index: 0 })}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText || "Evet, Onayla"}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </DashboardLayout>
  );
};

export default AdminSikayetler;
