import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchAllPages } from '../../services/pagination';
import { Users, UserCheck } from 'lucide-react';
import './AdminDashboard.css'; // sharing dashboard layouts and variables

const formatPhone = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  let formatted = '';
  if (digits.length > 0) {
    formatted = digits.slice(0, 4);
    if (digits.length > 4) {
      formatted += ' ' + digits.slice(4, 7);
      if (digits.length > 7) {
        formatted += ' ' + digits.slice(7, 9);
        if (digits.length > 9) {
          formatted += ' ' + digits.slice(9, 11);
        }
      }
    }
  }
  return formatted;
};

const AdminPersonel = () => {
  const [activeTab, setActiveTab] = useState('cavuslar');
  const [cavuslar, setCavuslar] = useState([]);
  const [soforler, setSoforler] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cavItems, sofItems] = await Promise.all([
        fetchAllPages('/admin/cavuslar'),
        fetchAllPages('/admin/soforler')
      ]);
      setCavuslar(cavItems);
      setSoforler(sofItems);
    } catch (err) {
      console.error("Personel listesi yüklenemedi", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout title="Personel Listesi"><p>Yükleniyor...</p></DashboardLayout>;

  return (
    <DashboardLayout title="Personel Yönetim Paneli">
      <div className="admin-personel" style={{ padding: '0.5rem' }}>
        
        {/* Sekme Butonları */}
        <div className="role-tabs" role="tablist" aria-label="Personel türü" style={{ display: 'flex', maxWidth: '300px', marginBottom: '2rem' }}>
          <button 
            type="button" 
            className={`role-tab ${activeTab === 'cavuslar' ? 'active' : ''}`}
            onClick={() => setActiveTab('cavuslar')}
            role="tab"
            aria-selected={activeTab === 'cavuslar'}
            aria-controls="cavuslar-panel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserCheck size={16} /> <span>Çavuşlar ({cavuslar.length})</span>
          </button>
          <button 
            type="button" 
            className={`role-tab ${activeTab === 'soforler' ? 'active' : ''}`}
            onClick={() => setActiveTab('soforler')}
            role="tab"
            aria-selected={activeTab === 'soforler'}
            aria-controls="soforler-panel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Users size={16} /> <span>Şoförler ({soforler.length})</span>
          </button>
        </div>

        {/* Çavuşlar Listesi */}
        {activeTab === 'cavuslar' && (
          <div id="cavuslar-panel" role="tabpanel" className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table className="responsive-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem' }}>Ad Soyad</th>
                  <th style={{ padding: '0.75rem' }}>Telefon</th>
                  <th style={{ padding: '0.75rem' }}>Sorumlu Mahalle</th>
                  <th style={{ padding: '0.75rem' }}>Durum</th>
                  <th style={{ padding: '0.75rem' }}>Kayıt Tarihi</th>
                </tr>
              </thead>
              <tbody>
                {cavuslar.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Kayıtlı çavuş bulunmamaktadır.</td>
                  </tr>
                ) : (
                  cavuslar.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                      <td data-label="Ad Soyad" style={{ padding: '0.75rem', fontWeight: 600 }}>{c.ad_soyad}</td>
                      <td data-label="Telefon" style={{ padding: '0.75rem' }}>{formatPhone(c.telefon)}</td>
                      <td data-label="Sorumlu Mahalle" style={{ padding: '0.75rem' }}>{c.mahalle_ad || 'Belirtilmemiş'}</td>
                      <td data-label="Durum" style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor: c.aktif_mi ? 'var(--success-color)' : 'var(--danger-color)'
                        }}>
                          {c.aktif_mi ? 'AKTİF' : 'PASİF'}
                        </span>
                      </td>
                      <td data-label="Kayıt Tarihi" style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(c.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Şoförler Listesi */}
        {activeTab === 'soforler' && (
          <div id="soforler-panel" role="tabpanel" className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table className="responsive-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem' }}>Ad Soyad</th>
                  <th style={{ padding: '0.75rem' }}>Telefon</th>
                  <th style={{ padding: '0.75rem' }}>Kullandığı Araç</th>
                  <th style={{ padding: '0.75rem' }}>Bağlı Olduğu Çavuş</th>
                  <th style={{ padding: '0.75rem' }}>Bölge (Mahalle)</th>
                  <th style={{ padding: '0.75rem' }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {soforler.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Kayıtlı şoför bulunmamaktadır.</td>
                  </tr>
                ) : (
                  soforler.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                      <td data-label="Ad Soyad" style={{ padding: '0.75rem', fontWeight: 600 }}>{s.ad} {s.soyad}</td>
                      <td data-label="Telefon" style={{ padding: '0.75rem' }}>{formatPhone(s.telefon)}</td>
                      <td data-label="Kullandığı Araç" style={{ padding: '0.75rem' }}>
                        {s.plaka ? (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            backgroundColor: 'var(--bg-secondary)',
                            fontSize: '0.85rem'
                          }}>
                            {s.plaka}
                          </span>
                        ) : 'Yok'}
                      </td>
                      <td data-label="Bağlı Olduğu Çavuş" style={{ padding: '0.75rem' }}>{s.cavus_ad_soyad || '-'}</td>
                      <td data-label="Bölge" style={{ padding: '0.75rem' }}>{s.mahalle_ad || '-'}</td>
                      <td data-label="Durum" style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor: s.aktif_mi ? 'var(--success-color)' : 'var(--danger-color)'
                        }}>
                          {s.aktif_mi ? 'AKTİF' : 'PASİF'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AdminPersonel;
