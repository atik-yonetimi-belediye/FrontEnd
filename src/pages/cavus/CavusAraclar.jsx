import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import { fetchAllPages } from '../../services/pagination';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ConfirmModal from '../../components/ConfirmModal';
import { Truck, Users, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import './CavusAraclar.css';

const formatPhone = (value) => {
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

const CavusAraclar = () => {
  const [araclar, setAraclar] = useState([]);
  const [soforler, setSoforler] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Arac Form
  const [plaka, setPlaka] = useState('');
  const [aracTuru, setAracTuru] = useState('kati_atik');

  // New Sofor Form
  const [sAd, setSAd] = useState('');
  const [sSoyad, setSSoyad] = useState('');
  const [sTelefon, setSTelefon] = useState('');
  const [sSifre, setSSifre] = useState('');
  const [sAracId, setSAracId] = useState('');
  const [showSoforPassword, setShowSoforPassword] = useState(false);

  // Confirm Modals
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'warning' });
  
  // Info / Error Modal for Plate & Sofor rules
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', content: null });

  // Driver vehicle transfer modal
  const [transferModal, setTransferModal] = useState({ isOpen: false, soforId: null, currentAracId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [aracItems, soforItems] = await Promise.all([
        fetchAllPages('/cavus/araclar'),
        fetchAllPages('/cavus/soforler')
      ]);
      const activeAraclar = aracItems.filter(a => a.aktif_mi);
      const activeSoforler = soforItems.filter(s => s.aktif_mi);
      
      setAraclar(activeAraclar);
      setSoforler(activeSoforler);
      
      if(activeAraclar.length > 0) {
        setSAracId(activeAraclar[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlakaChange = (e) => {
    setPlaka(e.target.value.toUpperCase());
  };

  const handleAddArac = async (e) => {
    e.preventDefault();
    if(!plaka) {
      return setInfoModal({
        isOpen: true,
        title: "Plaka Girilmedi",
        content: <p>Lütfen eklemek istediğiniz aracın plakasını giriniz.</p>
      });
    }
    
    // Turkish Plate Format check: E.g., 46 ABC 123
    const plateRegex = /^[0-9]{2}\s[A-ZÇĞİÖŞÜ]{1,4}\s[0-9]{2,4}$/;
    if (!plateRegex.test(plaka)) {
      return setInfoModal({
        isOpen: true,
        title: "Hatalı Plaka Formatı!",
        content: (
          <div style={{ textAlign: 'left', marginTop: '0.5rem' }}>
            <p style={{ fontWeight: 600, color: 'var(--danger-color)', marginBottom: '0.5rem' }}>
              Girdiğiniz plaka geçerli kurallara uymuyor.
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              <li><strong>İl Kodu:</strong> Başta 2 haneli il kodu (Örn: 46)</li>
              <li><strong>Harf Grubu:</strong> Ortada 1 ile 4 harf arası (Sadece büyük Türkçe/İngilizce harf, sembol/özel karakter içeremez)</li>
              <li><strong>Rakam Grubu:</strong> Sonunda 2 ile 4 rakam arası</li>
              <li><strong>Örnekler:</strong> <code>46 ABC 123</code>, <code>06 A 1234</code>, <code>34 BCD 99</code></li>
            </ul>
          </div>
        )
      });
    }

    try {
      const res = await api.post('/cavus/araclar', { plaka, arac_turu: aracTuru });
      setAraclar([...araclar, res.data.data]);
      setPlaka('');
      setInfoModal({
        isOpen: true,
        title: "Araç Başarıyla Eklendi",
        content: <p style={{ color: 'var(--success-color)', fontWeight: 600 }}>{plaka} plakalı araç sisteme kaydedildi.</p>
      });
    } catch (err) {
      setInfoModal({
        isOpen: true,
        title: "Araç Eklenemedi",
        content: <p>{err.response?.data?.message || "Araç eklenirken bir sorun oluştu."}</p>
      });
    }
  };

  const handleToggleAracTuru = async (arac) => {
    const yeniTur = arac.arac_turu === 'kati_atik' ? 'geri_donusum' : 'kati_atik';
    const turEtiketi = yeniTur === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık';

    setConfirmModal({
      isOpen: true,
      title: "Araç Görevini Değiştir",
      message: `${arac.plaka} plakalı aracın görevini "${turEtiketi}" olarak güncellemek istediğinize emin misiniz?`,
      variant: "info",
      onConfirm: async () => {
        try {
          await api.patch(`/cavus/araclar/${arac.id}`, { arac_turu: yeniTur });
          setAraclar(prev => prev.map(a => a.id === arac.id ? { ...a, arac_turu: yeniTur } : a));
          setConfirmModal({ isOpen: false });
        } catch {
          alert("Görev güncellenemedi.");
        }
      }
    });
  };

  const handlePassiveAracPrompt = (id, plaka) => {
    setConfirmModal({
      isOpen: true,
      title: "Aracı Pasife Al",
      message: `${plaka} plakalı aracı pasif yapmak istediğinize emin misiniz?`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.patch(`/cavus/araclar/${id}/passive`);
          setAraclar(araclar.filter(a => a.id !== id));
          setConfirmModal({ isOpen: false });
        } catch {
          alert("İşlem başarısız.");
        }
      }
    });
  };

  const handleAddSofor = async (e) => {
    e.preventDefault();
    if(!sAd || !sSoyad || !sTelefon || !sSifre || !sAracId) {
      return setInfoModal({
        isOpen: true,
        title: "Eksik Bilgi",
        content: <p>Lütfen tüm zorunlu alanları (Ad, Soyad, Telefon, Şifre, Araç) doldurunuz.</p>
      });
    }

    if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]{2,}$/.test(sAd.trim())) {
      return setInfoModal({
        isOpen: true,
        title: "Geçersiz Ad",
        content: <p>Ad en az 2 karakter olmalı ve sadece harflerden oluşmalıdır.</p>
      });
    }

    if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]{2,}$/.test(sSoyad.trim())) {
      return setInfoModal({
        isOpen: true,
        title: "Geçersiz Soyad",
        content: <p>Soyad en az 2 karakter olmalı ve sadece harflerden oluşmalıdır.</p>
      });
    }

    const cleanPhone = sTelefon.replace(/\s/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('05')) {
      return setInfoModal({
        isOpen: true,
        title: "Geçersiz Telefon Numarası",
        content: <p>Telefon numarası 11 haneli olmalı ve '05' ile başlamalıdır (Örn: 05XX XXX XX XX).</p>
      });
    }

    if (sSifre.length < 8) {
      return setInfoModal({
        isOpen: true,
        title: "Zayıf Şifre",
        content: <p>Şifre en az 8 karakterden oluşmalıdır.</p>
      });
    }

    try {
      const res = await api.post('/cavus/soforler', { 
        ad: sAd.trim(), 
        soyad: sSoyad.trim(), 
        telefon: cleanPhone, 
        sifre: sSifre, 
        arac_id: parseInt(sAracId)
      });
      
      const selectedArac = araclar.find(a => a.id === parseInt(sAracId));
      const newSofor = { ...res.data.data, plaka: selectedArac?.plaka };
      setSoforler([...soforler, newSofor]);
      setSAd(''); 
      setSSoyad(''); 
      setSTelefon(''); 
      setSSifre('');
      
      setInfoModal({
        isOpen: true,
        title: "Şoför Başarıyla Kaydedildi! 🎉",
        content: (
          <div style={{ textAlign: 'left', marginTop: '0.5rem' }}>
            <p style={{ color: 'var(--success-color)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Şoför sisteme eklendi ve seçilen araca tanımlandı.
            </p>
            <p className="text-muted text-sm">
              Ad Soyad: <strong>{sAd} {sSoyad}</strong><br/>
              Telefon: <strong>{formatPhone(cleanPhone)}</strong><br/>
              Zimmetli Araç: <strong>{selectedArac?.plaka}</strong>
            </p>
          </div>
        )
      });
    } catch (err) {
      setInfoModal({
        isOpen: true,
        title: "Şoför Eklenemedi",
        content: <p>{err.response?.data?.message || "Şoför kaydı oluşturulurken hata oluştu."}</p>
      });
    }
  };

  const handlePassiveSoforPrompt = (id, adSoyad) => {
    setConfirmModal({
      isOpen: true,
      title: "Şoförü Pasife Al",
      message: `${adSoyad} adlı şoförü pasif yapmak istediğinize emin misiniz?`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.patch(`/cavus/soforler/${id}/passive`);
          setSoforler(soforler.filter(s => s.id !== id));
          setConfirmModal({ isOpen: false });
        } catch {
          alert("İşlem başarısız.");
        }
      }
    });
  };

  const handleTransferArac = async () => {
    if (!transferModal.soforId || !transferModal.currentAracId) return;
    try {
      await api.patch(`/cavus/soforler/${transferModal.soforId}/arac`, {
        arac_id: parseInt(transferModal.currentAracId)
      });
      const updatedArac = araclar.find(a => a.id === parseInt(transferModal.currentAracId));
      setSoforler(prev => prev.map(s => s.id === transferModal.soforId ? { ...s, arac_id: updatedArac.id, plaka: updatedArac.plaka } : s));
      setTransferModal({ isOpen: false, soforId: null, currentAracId: '' });
      setInfoModal({
        isOpen: true,
        title: "Araç Transferi Başarılı",
        content: <p>Şoförün zimmetli aracı <strong>{updatedArac.plaka}</strong> olarak güncellendi.</p>
      });
    } catch {
      alert("Transfer işlemi gerçekleştirilemedi.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Araç & Şoför Yönetimi">
        <div className="cavus-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
          {[1, 2].map(n => (
            <div key={n} className="arac-sofor-section glass-panel" style={{ padding: '1.5rem', minHeight: '380px' }}>
              <div className="skeleton skeleton-title" style={{ width: '55%', height: '22px', marginBottom: '1.5rem' }} />
              {[1, 2].map(x => (
                <div key={x} style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '40%', height: '16px', margin: 0 }} />
                    <div className="skeleton" style={{ width: '65px', height: '20px', borderRadius: '4px' }} />
                  </div>
                  <div className="skeleton skeleton-text" style={{ width: '75%', height: '12px', marginBottom: '8px' }} />
                  <div className="skeleton skeleton-text" style={{ width: '85%', height: '12px' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Araç ve Şoför Yönetimi">
      <div className="cavus-araclar">
        
        <div className="management-grid">
          
          {/* Araçlar Bölümü */}
          <div className="management-section">
            <div className="glass-panel p-4 mb-4">
              <h3 style={{display:'flex', alignItems:'center', gap:'8px'}}><Truck size={20}/> Yeni Araç Ekle</h3>
              <form onSubmit={handleAddArac} className="add-form">
                <Input label="Plaka" placeholder="Örn: 46 ABC 123" value={plaka} onChange={handlePlakaChange} required />
                
                <div className="form-group">
                  <label htmlFor="vehicle-type">Araç Görevi / Türü</label>
                  <select id="vehicle-type" className="custom-select" value={aracTuru} onChange={e=>setAracTuru(e.target.value)}>
                    <option value="kati_atik">Katı Atık (Çöp Kamyonu)</option>
                    <option value="geri_donusum">Geri Dönüşüm Kamyonu</option>
                  </select>
                </div>
                
                <Button type="submit" variant="primary">Araç Ekle</Button>
              </form>

              <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                ℹ️ <strong>Plaka Kuralları:</strong> Başta 2 hane il kodu, ortada en fazla 4 harf (özel karakter içeremez), sonunda 2-4 rakam olmalıdır.
              </div>
            </div>

            <h3>Aktif Araçlar ({araclar.length})</h3>
            <div className="list-container">
              {araclar.length === 0 ? (
                <p className="text-muted">Aktif araç bulunmuyor.</p>
              ) : (
                araclar.map(a => (
                  <div key={a.id} className="list-card glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{a.plaka}</h4>
                      <span className="badge" style={{ marginTop: '0.25rem', backgroundColor: a.arac_turu === 'geri_donusum' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: a.arac_turu === 'geri_donusum' ? '#10b981' : '#3b82f6' }}>
                        {a.arac_turu === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="outline" size="sm" onClick={() => handleToggleAracTuru(a)} title="Görevi Değiştir (Katı <-> Geri Dönüşüm)">
                        <RefreshCw size={14} /> Görev Değiştir
                      </Button>
                      <Button variant="ghost" className="text-danger" onClick={() => handlePassiveAracPrompt(a.id, a.plaka)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Şoförler Bölümü */}
          <div className="management-section">
            <div className="glass-panel p-4 mb-4">
              <h3 style={{display:'flex', alignItems:'center', gap:'8px'}}><Users size={20}/> Yeni Şoför Ekle</h3>
              <form onSubmit={handleAddSofor} className="add-form">
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                  <Input label="Ad" placeholder="En az 2 harf" value={sAd} onChange={e=>setSAd(e.target.value)} required />
                  <Input label="Soyad" placeholder="En az 2 harf" value={sSoyad} onChange={e=>setSSoyad(e.target.value)} required />
                </div>
                <Input label="Telefon" placeholder="05XX XXX XX XX" value={sTelefon} onChange={e => setSTelefon(formatPhone(e.target.value))} required />
                
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="driver-password">Şifre</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      id="driver-password"
                      type={showSoforPassword ? "text" : "password"}
                      placeholder="Şifre (En az 8 karakter)"
                      value={sSifre}
                      onChange={e => setSSifre(e.target.value)}
                      className="custom-input"
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button 
                      type="button" 
                      className="icon-touch-button"
                      onClick={() => setShowSoforPassword(!showSoforPassword)}
                      aria-label={showSoforPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      style={{
                        position: 'absolute',
                        right: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {showSoforPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="driver-vehicle">Kullanacağı Araç (Plaka)</label>
                  <select id="driver-vehicle" className="custom-select" value={sAracId} onChange={e=>setSAracId(e.target.value)} required>
                    <option value="">Seçiniz...</option>
                    {araclar.map(a => (
                      <option key={a.id} value={a.id}>{a.plaka} ({a.arac_turu === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık'})</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="primary">Şoför Ekle</Button>
              </form>

              <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                📌 <strong>Şoför Kuralları:</strong> Ad/Soyad harf olmalı, Telefon 11 hane (05XX...), Şifre en az 8 karakter olmalıdır.
              </div>
            </div>

            <h3>Aktif Şoförler ({soforler.length})</h3>
            <div className="list-container">
              {soforler.length === 0 ? (
                <p className="text-muted">Aktif şoför bulunmuyor.</p>
              ) : (
                soforler.map(s => (
                  <div key={s.id} className="list-card glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{s.ad} {s.soyad}</h4>
                      <p className="text-muted text-sm" style={{ margin: '0.25rem 0' }}>Tel: {formatPhone(s.telefon)}</p>
                      <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)', fontWeight: 600 }}>
                        🚛 Araç: {s.plaka || 'Atanmamış'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setTransferModal({ isOpen: true, soforId: s.id, currentAracId: s.arac_id || '' })}
                        title="Başka Plakaya Aktar / Aracı Değiştir"
                      >
                        <RefreshCw size={14} /> Aracı Aktar
                      </Button>
                      <Button variant="ghost" className="text-danger" onClick={() => handlePassiveSoforPrompt(s.id, `${s.ad} ${s.soyad}`)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

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

      {/* Info / Rule Modal */}
      <ConfirmModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        confirmText="Anladım / Tamam"
        cancelText=""
        variant="info"
        onConfirm={() => setInfoModal({ isOpen: false })}
        onCancel={() => setInfoModal({ isOpen: false })}
      >
        <div className="modal-message">{infoModal.content}</div>
      </ConfirmModal>

      {/* Driver Transfer Modal */}
      <ConfirmModal
        isOpen={transferModal.isOpen}
        title="Şoför Araç Transferi"
        message="Şoförün atanacağı yeni aracı/plakayı seçiniz."
        confirmText="Transfer Et"
        confirmDisabled={!transferModal.currentAracId}
        variant="info"
        onConfirm={handleTransferArac}
        onCancel={() => setTransferModal({ isOpen: false })}
      >
            <div className="form-group" style={{ textAlign: 'left', marginTop: '1rem' }}>
              <label htmlFor="transfer-vehicle">Yeni Zimmetlenecek Araç</label>
              <select 
                id="transfer-vehicle"
                className="custom-select" 
                value={transferModal.currentAracId} 
                onChange={e => setTransferModal(prev => ({ ...prev, currentAracId: e.target.value }))}
              >
                <option value="">Araç Seçiniz...</option>
                {araclar.map(a => (
                  <option key={a.id} value={a.id}>{a.plaka} ({a.arac_turu === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık'})</option>
                ))}
              </select>
            </div>
      </ConfirmModal>
    </DashboardLayout>
  );
};

export default CavusAraclar;
