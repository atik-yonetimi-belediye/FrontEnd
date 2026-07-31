import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import { CheckCircle, MapPin } from 'lucide-react';

const statusLabels = {
  bekliyor: 'BEKLİYOR',
  onaylandi: 'ONAYLANDI',
  reddedildi: 'REDDEDİLDİ',
  tamamlandi: 'TAMAMLANDI',
  iptal_edildi: 'İPTAL EDİLDİ'
};

const statusColors = {
  bekliyor: '#f59e0b',
  onaylandi: '#3b82f6',
  reddedildi: '#ef4444',
  tamamlandi: '#10b981',
  iptal_edildi: '#6b7280'
};

const AdminGeriDonusum = () => {
  const [talepler, setTalepler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('hepsi');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'warning' });

  useEffect(() => {
    fetchTalepler();
  }, []);

  const fetchTalepler = async () => {
    try {
      const res = await api.get('/recycling-requests', { params: { limit: 200 } });
      if (res.data.success) {
        setTalepler(res.data.data);
      }
    } catch (err) {
      console.error("Geri dönüşüm talepleri yüklenemedi", err);
    } finally {
      setLoading(false);
    }
  };

  const promptUpdateDurum = (id, yeniDurum, baslik) => {
    setConfirmModal({
      isOpen: true,
      title: "Talep Durumu Güncelle",
      message: `"${baslik || 'Geri Dönüşüm Talebi'}" için durumu "${statusLabels[yeniDurum]}" olarak değiştirmek istediğinize emin misiniz?`,
      variant: yeniDurum === 'reddedildi' || yeniDurum === 'iptal_edildi' ? 'danger' : 'info',
      onConfirm: async () => {
        try {
          const res = await api.patch(`/recycling-requests/${id}/durum`, { durum: yeniDurum });
          if (res.data.success) {
            setTalepler(prev => prev.map(t => t.id === id ? { ...t, durum: yeniDurum } : t));
            setConfirmModal({ isOpen: false });
          }
        } catch {
          alert("Durum güncellenirken hata oluştu.");
        }
      }
    });
  };

  const filtered = talepler.filter(t => filter === 'hepsi' ? true : t.durum === filter);

  if (loading) return <DashboardLayout title="Geri Dönüşüm Talepleri"><p>Yükleniyor...</p></DashboardLayout>;

  return (
    <DashboardLayout title="Geri Dönüşüm Talepleri">
      <div className="admin-geri-donusum">
        
        {/* Filtre Grubu */}
        <div className="glass-panel filter-bar mb-4" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', alignItems: 'center' }}>
          <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-muted">Filtre:</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="custom-select" style={{ width: 'auto' }}>
              <option value="hepsi">Tüm Talepler</option>
              <option value="bekliyor">Onay Bekleyenler</option>
              <option value="onaylandi">Onaylananlar</option>
              <option value="reddedildi">Reddedilenler</option>
              <option value="tamamlandi">Tamamlananlar</option>
              <option value="iptal_edildi">İptal Edilenler</option>
            </select>
          </div>
          <div className="stats-badge">Toplam: {filtered.length} Kayıt</div>
        </div>

        {/* Liste Tablosu */}
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>Gönderen / Şirket</th>
                <th style={{ padding: '0.75rem' }}>Tür</th>
                <th style={{ padding: '0.75rem' }}>Başlık & Detay</th>
                <th style={{ padding: '0.75rem' }}>Miktar</th>
                <th style={{ padding: '0.75rem' }}>Adres & Konum</th>
                <th style={{ padding: '0.75rem' }}>Durum</th>
                <th style={{ padding: '0.75rem', width: '220px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Talep bulunmamaktadır.</td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{t.gonderen_ad}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {t.gonderen_telefon} ({t.gonderen_tipi === 'sirket' ? 'Şirket' : 'Vatandaş'})
                      </div>
                      {t.sirket_ad && <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>{t.sirket_ad}</div>}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary-hover)'
                      }}>
                        {t.atik_turu ? t.atik_turu.toUpperCase() : 'GERİ DÖNÜŞÜM'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', maxWidth: '250px' }}>
                      <div style={{ fontWeight: 600 }}>{t.talep_basligi || 'Başlıksız'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.talep_aciklamasi}>
                        {t.talep_aciklamasi || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      {t.tahmini_miktar ? `${t.tahmini_miktar} kg` : 'Belirtilmedi'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {t.konteyner_kodu ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-color)' }}>
                          <MapPin size={14} /> <span>{t.konteyner_kodu} ({t.mahalle_ad})</span>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)' }}>{t.adres || 'Belirtilmedi'}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        backgroundColor: statusColors[t.durum] || '#ccc'
                      }}>
                        {statusLabels[t.durum]}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {t.durum === 'bekliyor' && (
                          <>
                            <Button size="sm" variant="primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => promptUpdateDurum(t.id, 'onaylandi', t.talep_basligi)}>
                              Onayla
                            </Button>
                            <Button size="sm" variant="outline" className="text-danger border-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => promptUpdateDurum(t.id, 'reddedildi', t.talep_basligi)}>
                              Reddet
                            </Button>
                          </>
                        )}
                        {t.durum === 'onaylandi' && (
                          <>
                            <Button size="sm" variant="primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'var(--success-color)' }} onClick={() => promptUpdateDurum(t.id, 'tamamlandi', t.talep_basligi)}>
                              <CheckCircle size={12} /> Tamamlandı
                            </Button>
                            <Button size="sm" variant="outline" className="text-danger border-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => promptUpdateDurum(t.id, 'iptal_edildi', t.talep_basligi)}>
                              İptal Et
                            </Button>
                          </>
                        )}
                        {t.durum !== 'bekliyor' && t.durum !== 'onaylandi' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İşlem bitti</span>
                        )}
                      </div>
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
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </DashboardLayout>
  );
};

export default AdminGeriDonusum;
