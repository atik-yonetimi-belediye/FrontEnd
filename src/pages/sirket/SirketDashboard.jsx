import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ConfirmModal from '../../components/ConfirmModal';
import { PlusCircle, FileText, CheckCircle, Clock, XCircle, Edit } from 'lucide-react';
import './SirketDashboard.css';

const SirketDashboard = () => {
  const [talepler, setTalepler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingTalep, setEditingTalep] = useState(null);

  const [formData, setFormData] = useState({
    talep_basligi: '',
    talep_aciklamasi: '',
    tahmini_miktar: '',
    adres: ''
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'warning' });

  useEffect(() => {
    fetchTalepler();
  }, []);

  const fetchTalepler = async () => {
    try {
      const res = await api.get('/sirket/geri-donusum-talepleri', {
        params: { limit: 200 }
      });
      if (res.data.success) {
        setTalepler(res.data.data);
      }
    } catch (err) {
      console.error("Talepler getirilemedi", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateForm = () => {
    setEditingTalep(null);
    setFormData({ talep_basligi: '', talep_aciklamasi: '', tahmini_miktar: '', adres: '' });
    setFormOpen(true);
  };

  const openEditForm = (talep) => {
    setEditingTalep(talep);
    setFormData({
      talep_basligi: talep.talep_basligi || '',
      talep_aciklamasi: talep.talep_aciklamasi || '',
      tahmini_miktar: talep.tahmini_miktar || '',
      adres: talep.adres || ''
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

      if (editingTalep) {
        await api.put(`/sirket/geri-donusum-talepleri/${editingTalep.id}`, payload);
      } else {
        await api.post('/sirket/geri-donusum-talepleri', payload);
      }

      setFormOpen(false);
      setEditingTalep(null);
      setFormData({ talep_basligi: '', talep_aciklamasi: '', tahmini_miktar: '', adres: '' });
      fetchTalepler();
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
          setTalepler(prev => prev.map(t => t.id === id ? { ...t, durum: 'iptal_edildi' } : t));
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

  if (loading) return <DashboardLayout title="Taleplerim"><p>Yükleniyor...</p></DashboardLayout>;

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
            <form onSubmit={handleSubmit} className="talep-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="Talep Başlığı" name="talep_basligi" value={formData.talep_basligi} onChange={handleInputChange} required />
              <Input label="Tahmini Miktar (kg)" type="number" step="0.1" name="tahmini_miktar" value={formData.tahmini_miktar} onChange={handleInputChange} required />
              <div className="form-group" style={{gridColumn: '1 / -1'}}>
                <label className="input-label">Açıklama</label>
                <textarea className="custom-textarea" name="talep_aciklamasi" value={formData.talep_aciklamasi} onChange={handleInputChange} required style={{ width: '100%', minHeight: '70px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div className="form-group" style={{gridColumn: '1 / -1'}}>
                <label className="input-label">Adres</label>
                <textarea className="custom-textarea" name="adres" value={formData.adres} onChange={handleInputChange} required style={{ width: '100%', minHeight: '70px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div className="form-actions" style={{gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem'}}>
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>İptal</Button>
                <Button type="submit" variant="primary">{editingTalep ? 'Değişiklikleri Kaydet' : 'Talebi Gönder'}</Button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                    <td className="font-medium" style={{ padding: '0.75rem', fontWeight: 600 }}>{t.talep_basligi}</td>
                    <td style={{ padding: '0.75rem' }}>{t.tahmini_miktar ? `${t.tahmini_miktar} kg` : '-'}</td>
                    <td className="text-muted" style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(t.tarih_saat || t.created_at || t.olusturulma_tarihi)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {getStatusIcon(t.durum)} <span>{getStatusLabel(t.durum)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
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
