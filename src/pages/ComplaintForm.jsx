import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, ArrowLeft, Sun, Moon, MapPin, User, ChevronRight, ChevronLeft, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import Button from '../components/Button';
import Input from '../components/Input';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/useToast';
import api, { getApiErrorMessage } from '../services/api';
import { fetchAllPages } from '../services/pagination';
import ComplaintDetailStep from '../components/ComplaintDetailStep';
import { preparePhotoForUpload } from '../utils/imageProcessing';
import { MAP_LAYERS } from '../components/maps/mapLayers';
import 'leaflet/dist/leaflet.css';
import './ComplaintForm.css';

const createIcon = (type) => {
  const color = type === 'geri_donusum' ? '#10b981' : '#3b82f6';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

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

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DRAFT_KEY = 'atik-complaint-draft-v1';
const EMPTY_FORM = {
  vatandas_ad_soyad: '', vatandas_telefon: '', konteyner_id: '', sikayet_turu: 'kati_atik', sikayet_kategorisi: '', sikayet_metni: ''
};

function readDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    return draft && typeof draft === 'object' ? { ...EMPTY_FORM, ...draft } : EMPTY_FORM;
  } catch { return EMPTY_FORM; }
}

const ComplaintForm = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState(readDraft);
  
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  const [files, setFiles] = useState([]);
  const [containers, setContainers] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [locatingGPS, setLocatingGPS] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(formData)), 350);
    return () => window.clearTimeout(timer);
  }, [formData]);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const items = await fetchAllPages('/konteynerler', { params: { aktif_mi: true } });
        setContainers(items);
      } catch (err) {
        console.error("Konteynerler yüklenemedi", err);
      }
    };
    fetchContainers();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]*$/.test(val)) {
      setFormData(prev => ({ ...prev, vatandas_ad_soyad: val }));
      if (val.trim().length >= 3 || val.trim().length === 0) {
        setNameError('');
      } else {
        setNameError('Ad soyad en az 3 karakter olmalıdır.');
      }
    } else {
      setNameError('Ad soyad yalnızca harf ve boşluk içerebilir.');
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    const formatted = formatPhone(val);
    setFormData(prev => ({ ...prev, vatandas_telefon: formatted }));
    
    const rawDigits = formatted.replace(/\s/g, '');
    if (rawDigits.length === 11 && rawDigits.startsWith('05')) {
      setPhoneError('');
    } else if (rawDigits.length === 0) {
      setPhoneError('');
    } else {
      setPhoneError('Telefon numarası 11 haneli (05XX XXX XX XX) olmalıdır.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContainerChange = (e) => {
    const cId = e.target.value;
    const selected = containers.find(c => String(c.id) === String(cId));
    setFormData(prev => ({
      ...prev,
      konteyner_id: cId,
      sikayet_turu: selected ? selected.tur : prev.sikayet_turu
    }));
  };

  const handleFindGPSLocation = () => {
    setLocatingGPS(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          if (containers.length > 0) {
            let minDist = Infinity;
            let closest = null;

            containers.forEach(c => {
              if (c.latitude && c.longitude) {
                const cLat = parseFloat(c.latitude);
                const cLng = parseFloat(c.longitude);
                const dLat = (cLat - lat) * (Math.PI / 180);
                const dLng = (cLng - lng) * (Math.PI / 180);
                const a = 
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat * (Math.PI / 180)) * Math.cos(cLat * (Math.PI / 180)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                if (dist < minDist) {
                  minDist = dist;
                  closest = c;
                }
              }
            });

            if (closest) {
              setFormData(prev => ({
                ...prev,
                konteyner_id: closest.id,
                sikayet_turu: closest.tur
              }));
              showToast(`📍 En yakın konteyner (${closest.konteyner_kodu}) otomatik seçildi.`, 'success');
            }
          }
          setLocatingGPS(false);
        },
        () => {
          showToast("Konum izni alınamadı, lütfen haritadan veya listeden seçim yapın.", "warning");
          setLocatingGPS(false);
        }
      );
    } else {
      setLocatingGPS(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    const invalidFile = selectedFiles.find(
      file => !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > 5 * 1024 * 1024
    );
    if (invalidFile) {
      setError('Fotoğraflar JPG, PNG veya WEBP olmalı ve dosya başına 5 MB sınırını aşmamalıdır.');
      e.target.value = '';
      return;
    }
    if (files.length + selectedFiles.length > 3) {
      setModalOpen(true);
      e.target.value = '';
      return;
    }
    try {
      const preparedFiles = await Promise.all(selectedFiles.map(preparePhotoForUpload));
      setFiles(prev => [...prev, ...preparedFiles]);
      setError('');
    } catch {
      setError('Fotoğraf hazırlanamadı. Lütfen farklı bir fotoğraf seçip yeniden deneyin.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.vatandas_ad_soyad || nameError) {
        setError("Lütfen geçerli bir Ad Soyad giriniz.");
        return;
      }
      const rawPhone = formData.vatandas_telefon.replace(/\s/g, '');
      if (rawPhone.length !== 11 || !rawPhone.startsWith('05') || phoneError) {
        setError("Lütfen 11 haneli geçerli bir telefon numarası giriniz.");
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.konteyner_id) {
        setError("Lütfen şikayetle ilgili konteyneri haritadan veya listeden seçiniz.");
        return;
      }
    }
    setError('');
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sikayet_kategorisi || !formData.sikayet_metni) {
      setError("Lütfen şikayet kategorisi ve detayını doldurunuz.");
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const data = new FormData();
      const phoneDigits = formData.vatandas_telefon.replace(/\s/g, '');
      const submitData = {
        ...formData,
        vatandas_telefon: phoneDigits
      };
      
      Object.keys(submitData).forEach(key => {
        data.append(key, submitData[key]);
      });
      
      files.forEach(file => {
        data.append('fotograflar', file);
      });

      const res = await api.post('/sikayetler', data);
      if (res.data.success) {
        localStorage.removeItem(DRAFT_KEY);
        setSuccess(true);
        showToast("Şikayetiniz başarıyla belediyemize iletildi.", "success");
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Şikâyet gönderilemedi. Lütfen tekrar deneyin.'));
    } finally {
      setLoading(false);
    }
  };

  const filteredContainers = containers.filter(c => {
    if (typeFilter === 'all') return true;
    return c.tur === typeFilter;
  });

  if (success) {
    return (
      <main className="container flex-center" id="main-content" tabIndex={-1} style={{ minHeight: '100vh' }}>
        <div className="success-card glass-panel animate-fade-in">
          <CheckCircle size={64} className="success-icon" />
          <h2>Şikayetiniz Alındı</h2>
          <p>Geri bildiriminiz için teşekkür ederiz. Ekiplerimiz en kısa sürede ilgilenecektir.</p>
          <Button variant="outline" onClick={() => navigate('/')}>Ana Sayfaya Dön</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="complaint-page" id="main-content" tabIndex={-1}>
      <div className="container form-container animate-fade-in">
        
        {/* Navigation & Theme Header */}
        <div className="complaint-header-nav">
          <Link to="/" className="back-link">
            <ArrowLeft size={20} />
            <span>Geri Dön</span>
          </Link>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Tema Değiştir" aria-label={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>

        <div className="form-header">
          <h2>Şikayet Bildir</h2>
          <p>Çevrenizdeki sorunları 3 kolay adımda bize iletin, hemen çözelim.</p>
        </div>

        {/* Stepper Bar */}
        <ol className="stepper-bar" aria-label="Şikâyet formu adımları">
          <li className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
            <button type="button" className="step-button" onClick={() => currentStep > 1 && setCurrentStep(1)} disabled={currentStep === 1} aria-current={currentStep === 1 ? 'step' : undefined}>
              <span className="step-number" aria-hidden="true">{currentStep > 1 ? '✓' : '1'}</span>
              <span className="step-label">İletişim</span>
            </button>
          </li>
          <li className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
            <button type="button" className="step-button" onClick={() => currentStep > 2 && setCurrentStep(2)} disabled={currentStep <= 2} aria-current={currentStep === 2 ? 'step' : undefined}>
              <span className="step-number" aria-hidden="true">{currentStep > 2 ? '✓' : '2'}</span>
              <span className="step-label">Konum</span>
            </button>
          </li>
          <li className={`step-item ${currentStep === 3 ? 'active' : ''}`}>
            <button type="button" className="step-button" disabled aria-current={currentStep === 3 ? 'step' : undefined}>
              <span className="step-number" aria-hidden="true">3</span>
              <span className="step-label">Detay & Fotoğraf</span>
            </button>
          </li>
        </ol>

        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="complaint-form glass-panel">
          
          {/* STEP 1: İletişim Bilgileri */}
          {currentStep === 1 && (
            <div className="step-content animate-fade-in">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} style={{ color: 'var(--primary-color)' }} /> Adım 1: İletişim Bilgileriniz
              </h3>
              
              <Input 
                label="Adınız Soyadınız" 
                name="vatandas_ad_soyad"
                placeholder="Adınız Soyadınız"
                value={formData.vatandas_ad_soyad}
                onChange={handleNameChange}
                error={nameError}
                required 
              />
              
              <Input 
                label="Telefon Numaranız" 
                name="vatandas_telefon"
                placeholder="05XX XXX XX XX"
                value={formData.vatandas_telefon}
                onChange={handlePhoneChange}
                error={phoneError}
                required 
              />
            </div>
          )}

          {/* STEP 2: Konum & Konteyner Seçimi */}
          {currentStep === 2 && (
            <div className="step-content animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} style={{ color: 'var(--primary-color)' }} /> Adım 2: Konteyner Seçimi
                </h3>
                
                <Button type="button" size="sm" variant="outline" onClick={handleFindGPSLocation} disabled={locatingGPS}>
                  <Navigation size={14} /> {locatingGPS ? 'Konum Alınıyor...' : '📍 GPS İle Konumumu Bul'}
                </Button>
              </div>

              {/* Map Filters */}
              <div className="type-filter-group">
                <button 
                  type="button" 
                  className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  Tüm Konteynerler
                </button>
                <button 
                  type="button" 
                  className={`filter-btn ${typeFilter === 'kati_atik' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('kati_atik')}
                >
                  Katı Atık (Çöp)
                </button>
                <button 
                  type="button" 
                  className={`filter-btn ${typeFilter === 'geri_donusum' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('geri_donusum')}
                >
                  Geri Dönüşüm
                </button>
              </div>

              <div className="glass-panel" style={{height: '240px', marginBottom: '1rem', overflow: 'hidden', borderRadius: 'var(--radius-md)'}}>
                <MapContainer center={[37.5858, 36.9145]} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url={MAP_LAYERS.street.url} attribution={MAP_LAYERS.street.attribution} />
                  {filteredContainers.map(c => (
                    c.latitude && c.longitude && (
                      <Marker 
                        key={c.id} 
                        position={[c.latitude, c.longitude]}
                        icon={createIcon(c.tur)}
                        title={`${c.konteyner_kodu} konteyneri`}
                        alt={`${c.konteyner_kodu} konteyneri`}
                        eventHandlers={{
                          click: () => {
                            setFormData(prev => ({ 
                              ...prev, 
                              konteyner_id: c.id,
                              sikayet_turu: c.tur
                            }));
                            showToast(`"${c.konteyner_kodu}" seçildi.`, 'info');
                          }
                        }}
                      >
                        <Popup className="custom-popup">
                          <div className="popup-content" style={{ textAlign: 'center' }}>
                            <strong className="popup-title">{c.konteyner_kodu}</strong><br/>
                            <span className="popup-subtitle">{c.tur === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık'}</span><br/>
                            <small className="popup-info">{c.mahalle_ad} Mah.</small>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))}
                </MapContainer>
              </div>
              
              <div className="form-group">
                <label className="input-label" htmlFor="complaint-container">Konteyner Listesinden Seçin</label>
                <select 
                  id="complaint-container"
                  className="custom-select" 
                  name="konteyner_id"
                  value={formData.konteyner_id}
                  onChange={handleContainerChange}
                  required
                >
                  <option value="">Konteyner Seçiniz...</option>
                  {filteredContainers.map(c => (
                    <option key={c.id} value={c.id}>{c.konteyner_kodu} - {c.mahalle_ad} ({c.tur === 'kati_atik' ? 'Katı Atık' : 'Geri Dönüşüm'})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: Şikayet Detayı & Fotoğraf */}
          {currentStep === 3 && <ComplaintDetailStep formData={formData} files={files} onInputChange={handleInputChange} onFileChange={handleFileChange} onRemoveFile={handleRemoveFile} />}

          {/* Wizard Action Buttons */}
          <div className="wizard-actions">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                <ChevronLeft size={18} /> Geri
              </Button>
            ) : <div />}

            {currentStep < 3 ? (
              <Button type="button" variant="primary" onClick={nextStep}>
                Devam Et <ChevronRight size={18} />
              </Button>
            ) : (
              <Button type="submit" variant="primary" size="lg" disabled={loading}>
                {loading ? 'Gönderiliyor...' : 'Şikayeti Tamamla ve Gönder'}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* 3+ Photo Warning Modal */}
      <ConfirmModal
        isOpen={modalOpen}
        title="Dosya Sınırı Uyarısı"
        message="Bir şikâyete en fazla 3 fotoğraf yükleyebilirsiniz. Lütfen gereksiz fotoğrafları kaldırın."
        confirmText="Tamam"
        cancelText=""
        variant="warning"
        onConfirm={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
      />
    </main>
  );
};

export default ComplaintForm;
