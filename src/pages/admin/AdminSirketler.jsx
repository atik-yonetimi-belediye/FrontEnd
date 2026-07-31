import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import { fetchAllPages } from '../../services/pagination';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import { Building, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import './AdminSirketler.css';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const AdminSirketler = () => {
  const [sirketler, setSirketler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs: 'bekleyen' | 'onaylandi' | 'hepsi'
  const [activeTab, setActiveTab] = useState('bekliyor');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'warning' });

  useEffect(() => {
    fetchSirketler();
  }, []);

  const fetchSirketler = async () => {
    try {
      setSirketler(await fetchAllPages('/admin/sirketler'));
    } catch (err) {
      console.error("Şirketler yüklenemedi", err);
    } finally {
      setLoading(false);
    }
  };

  const promptUpdateOnay = (id, sirketAd, yeniDurum) => {
    const isApprove = yeniDurum === 'onaylandi';
    const isPassive = yeniDurum === 'pasif';
    setConfirmModal({
      isOpen: true,
      title: isApprove
        ? "Şirket Başvurusunu Onayla"
        : isPassive
          ? "Şirketi Pasife Al"
          : "Şirket Başvurusunu Reddet",
      message: `"${sirketAd}" adlı şirketi ${
        isApprove ? 'onaylamak' : isPassive ? 'pasife almak' : 'reddetmek'
      } istediğinize emin misiniz?`,
      variant: isApprove ? "success" : "danger",
      confirmText: isApprove ? "Evet, Onayla" : isPassive ? "Evet, Pasife Al" : "Evet, Reddet",
      onConfirm: async () => {
        try {
          const res = await api.patch(`/admin/sirketler/${id}/onay-durumu`, { onay_durumu: yeniDurum });
          if (res.data.success) {
            setSirketler(prev => prev.map(s => s.id === id ? { ...s, onay_durumu: yeniDurum } : s));
            setConfirmModal({ isOpen: false });
          }
        } catch {
          alert("Durum güncellenirken hata oluştu.");
        }
      }
    });
  };

  const filtered = sirketler.filter(s => {
    const matchesTab = activeTab === 'hepsi' ? true : s.onay_durumu === activeTab;
    if (!matchesTab) return false;
    
    if (!debouncedSearchQuery) return true;
    const q = debouncedSearchQuery.toLocaleLowerCase('tr-TR');
    return (
      s.ad?.toLowerCase().includes(q) ||
      s.mail?.toLowerCase().includes(q) ||
      s.telefon?.includes(q) ||
      s.adres?.toLowerCase().includes(q)
    );
  });

  const bekleyenSayisi = sirketler.filter(s => s.onay_durumu === 'bekliyor').length;
  const onaylananSayisi = sirketler.filter(s => s.onay_durumu === 'onaylandi').length;

  const exportToCSV = () => {
    const headers = ["ID,SirketAdi,Mail,Telefon,Adres,Durum,Tarih"];
    const rows = filtered.map(s => 
      `${s.id},"${s.ad}","${s.mail}","${s.telefon}","${s.adres || ''}","${s.onay_durumu}","${new Date(s.created_at).toLocaleString('tr-TR')}"`
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sirketler.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <DashboardLayout title="Şirket Başvuruları ve Onayları">
        <div className="sirket-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="sirket-card glass-panel" style={{ padding: '1.5rem', minHeight: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div className="skeleton skeleton-title" style={{ width: '60%', height: '18px', margin: 0 }} />
                <div className="skeleton" style={{ width: '70px', height: '20px', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="skeleton skeleton-text" style={{ width: '85%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '65%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div className="skeleton" style={{ width: '50%', height: '35px', borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ width: '50%', height: '35px', borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Şirket Başvuruları ve Kayıtlı Şirketler">
      <div className="admin-sirketler">
        
        {/* Navigation Tabs */}
        <div className="glass-panel mb-4" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className={`quick-action-btn ${activeTab === 'bekliyor' ? 'active' : ''}`}
            onClick={() => setActiveTab('bekliyor')}
            style={{ 
              backgroundColor: activeTab === 'bekliyor' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'bekliyor' ? '#fff' : 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ⏳ Onay Bekleyenler ({bekleyenSayisi})
          </button>
          
          <button 
            className={`quick-action-btn ${activeTab === 'onaylandi' ? 'active' : ''}`}
            onClick={() => setActiveTab('onaylandi')}
            style={{ 
              backgroundColor: activeTab === 'onaylandi' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'onaylandi' ? '#fff' : 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🏢 Kayıtlı Şirketler ({onaylananSayisi})
          </button>

          <button 
            className={`quick-action-btn ${activeTab === 'hepsi' ? 'active' : ''}`}
            onClick={() => setActiveTab('hepsi')}
            style={{ 
              backgroundColor: activeTab === 'hepsi' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'hepsi' ? '#fff' : 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            📋 Tüm Şirketler ({sirketler.length})
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="glass-panel filter-bar mb-4" style={{display: 'flex', justifyContent: 'space-between', padding: '1rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Şirketlerde ara (Ad, mail, tel...)" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="custom-input"
              style={{ paddingLeft: '2.25rem', width: '260px', height: '38px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <Button size="sm" variant="outline" onClick={exportToCSV}>Excel'e Aktar (CSV)</Button>
            <div className="stats-badge">Toplam: {filtered.length} Şirket</div>
          </div>
        </div>

        <div className="sirket-list">
          {filtered.length === 0 ? (
            <p className="text-muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
              Bu kritere uygun şirket kaydı bulunamadı.
            </p>
          ) : (
            filtered.map(s => (
              <div key={s.id} className={`sirket-card glass-panel status-${s.onay_durumu}`}>
                <div className="c-header">
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <div className="c-icon-wrapper"><Building size={24}/></div>
                    <div>
                      <h4 style={{ margin: 0 }}>{s.ad}</h4>
                      <p className="text-muted text-sm" style={{ margin: '0.2rem 0' }}>E-Posta: {s.mail}</p>
                    </div>
                  </div>
                  <span className={`c-status-badge ${s.onay_durumu}`}>
                    {s.onay_durumu.toUpperCase()}
                  </span>
                </div>
                
                <div className="c-body">
                  <div className="c-info-grid">
                    <div>
                      <span className="text-muted text-sm">Telefon</span>
                      <p>{s.telefon}</p>
                    </div>
                    <div style={{gridColumn: '1 / -1', marginTop: '0.5rem'}}>
                      <span className="text-muted text-sm">Adres</span>
                      <p>{s.adres || 'Belirtilmemiş'}</p>
                    </div>
                  </div>
                </div>

                <div className="c-footer">
                  <span className="text-muted text-sm">
                    <Clock size={14} /> Kayıt: {new Date(s.created_at).toLocaleString('tr-TR')}
                  </span>
                  
                  <div className="c-actions">
                    {s.onay_durumu === 'bekliyor' && (
                      <>
                        <Button size="sm" variant="outline" className="text-danger border-danger" onClick={() => promptUpdateOnay(s.id, s.ad, 'reddedildi')}>
                          <XCircle size={14} /> Reddet
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => promptUpdateOnay(s.id, s.ad, 'onaylandi')}>
                          <CheckCircle size={14} /> Onayla
                        </Button>
                      </>
                    )}
                    {s.onay_durumu === 'reddedildi' && (
                      <Button size="sm" variant="primary" onClick={() => promptUpdateOnay(s.id, s.ad, 'onaylandi')}>
                        <CheckCircle size={14} /> Onayla
                      </Button>
                    )}
                    {s.onay_durumu === 'onaylandi' && (
                      <Button size="sm" variant="outline" className="text-danger border-danger" onClick={() => promptUpdateOnay(s.id, s.ad, 'pasif')}>
                        <XCircle size={14} /> Pasife Al
                      </Button>
                    )}
                    {s.onay_durumu === 'pasif' && (
                      <Button size="sm" variant="primary" onClick={() => promptUpdateOnay(s.id, s.ad, 'onaylandi')}>
                        <CheckCircle size={14} /> Yeniden Etkinleştir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
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

export default AdminSirketler;
