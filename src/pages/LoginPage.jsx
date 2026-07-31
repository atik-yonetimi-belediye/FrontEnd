import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Building, Truck, ShieldAlert, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import './LoginPage.css';

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

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [activeTab, setActiveTab] = useState('sofor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisteringCompany, setIsRegisteringCompany] = useState(false);
  
  // Registration Success Modal
  const [registerSuccessModalOpen, setRegisterSuccessModalOpen] = useState(false);

  const [credentials, setCredentials] = useState({
    telefon: '',
    kullanici_adi: '',
    mail: '',
    sifre: ''
  });

  const [registerData, setRegisterData] = useState({
    ad: '',
    adres: '',
    mail: '',
    telefon: '',
    sifre: '',
    sifreTekrar: ''
  });

  const tabs = [
    { id: 'sofor', label: 'Şoför', icon: <Truck size={18} /> },
    { id: 'cavus', label: 'Çavuş', icon: <User size={18} /> },
    { id: 'admin', label: 'Yönetici', icon: <ShieldAlert size={18} /> },
    { id: 'sirket', label: 'Şirket', icon: <Building size={18} /> },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneInputChange = (e) => {
    const val = e.target.value;
    const formatted = formatPhone(val);
    setCredentials(prev => ({ ...prev, telefon: formatted }));
  };

  const handleRegisterInputChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterPhoneChange = (e) => {
    const val = e.target.value;
    const formatted = formatPhone(val);
    setRegisterData(prev => ({ ...prev, telefon: formatted }));
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setError('');
    setIsRegisteringCompany(false);
    setCredentials({
      telefon: '',
      kullanici_adi: '',
      mail: '',
      sifre: ''
    });
    setRegisterData({
      ad: '',
      adres: '',
      mail: '',
      telefon: '',
      sifre: '',
      sifreTekrar: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let payload = { sifre: credentials.sifre };
    if (activeTab === 'admin') {
      payload.kullanici_adi = credentials.kullanici_adi;
    } else if (activeTab === 'sirket') {
      payload.mail = credentials.mail;
    } else {
      const rawDigits = credentials.telefon.replace(/\s/g, '');
      if (rawDigits.length !== 11 || !rawDigits.startsWith('05')) {
        setError('Lütfen geçerli bir telefon numarası girin (05XX XXX XX XX)');
        setLoading(false);
        return;
      }
      payload.telefon = rawDigits;
    }

    const res = await login(activeTab, payload);
    
    if (res.success) {
      navigate(`/${activeTab}`);
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!registerData.ad || !registerData.mail || !registerData.telefon || !registerData.sifre) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    // Strict TLD Email validation (e.g. deneme@mail without .com/.net TLD is invalid)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(registerData.mail.trim())) {
      setError('Lütfen geçerli bir e-posta adresi girin (Örn: ornek@sirket.com)');
      return;
    }

    const phoneDigits = registerData.telefon.replace(/\s/g, '');
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith('05')) {
      setError('Telefon numarası 11 haneli (05XX XXX XX XX) olmalıdır.');
      return;
    }

    if (registerData.sifre.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    if (registerData.sifre !== registerData.sifreTekrar) {
      setError('Şifreler uyuşmuyor.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/sirket/register', {
        ad: registerData.ad.trim(),
        adres: registerData.adres || null,
        mail: registerData.mail.trim(),
        telefon: phoneDigits,
        sifre: registerData.sifre
      });

      if (res.data.success) {
        setRegisterSuccessModalOpen(true);
        setRegisterData({
          ad: '',
          adres: '',
          mail: '',
          telefon: '',
          sifre: '',
          sifreTekrar: ''
        });
        setIsRegisteringCompany(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt oluşturulurken bir hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container glass-panel animate-fade-in">
        <div style={{marginBottom: '1rem'}}>
          <Link to="/" style={{textDecoration: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', width: 'fit-content'}}>
            <ArrowLeft size={16} /> Ana Sayfaya Dön
          </Link>
        </div>
        <div className="login-header">
          <h2>Onikişubat Belediyesi</h2>
          <p>Atık Yönetim Sistemi - Giriş</p>
        </div>

        <div className="role-tabs">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`role-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              type="button"
            >
              {tab.icon} <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Regular Login Forms */}
        {(!isRegisteringCompany || activeTab !== 'sirket') && (
          <form onSubmit={handleSubmit} className="login-form">
            {(activeTab === 'sofor' || activeTab === 'cavus') && (
              <Input 
                label="Telefon Numarası"
                name="telefon"
                placeholder="05XX XXX XX XX"
                value={credentials.telefon}
                onChange={handlePhoneInputChange}
                required
              />
            )}

            {activeTab === 'admin' && (
              <Input 
                label="Kullanıcı Adı"
                name="kullanici_adi"
                placeholder="Yönetici kullanıcı adınız"
                value={credentials.kullanici_adi}
                onChange={handleInputChange}
                required
              />
            )}

            {activeTab === 'sirket' && (
              <Input 
                label="E-Posta Adresi"
                name="mail"
                type="email"
                placeholder="ornek@sirket.com"
                value={credentials.mail}
                onChange={handleInputChange}
                required
              />
            )}

            <div className="input-wrapper">
              <label className="input-label">Şifre</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="sifre"
                  placeholder="Şifreniz"
                  value={credentials.sifre}
                  onChange={handleInputChange}
                  className="custom-input"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {activeTab === 'sirket' && (
              <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                <button 
                  type="button" 
                  onClick={() => setIsRegisteringCompany(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  Hesabınız yok mu? Şirket Kaydı Oluşturun
                </button>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full mt-4" size="lg" disabled={loading}>
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        )}

        {/* Company Register Form */}
        {activeTab === 'sirket' && isRegisteringCompany && (
          <form onSubmit={handleRegisterSubmit} className="login-form animate-fade-in">
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Şirket Başvurusu</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Yönetici onayından sonra sisteme giriş yapabilirsiniz.</p>
            </div>
            
            <Input 
              label="Şirket Adı"
              name="ad"
              placeholder="Şirketinizin Resmi Adı"
              value={registerData.ad}
              onChange={handleRegisterInputChange}
              required
            />
            
            <Input 
              label="E-Posta Adresi"
              name="mail"
              type="email"
              placeholder="ornek@sirket.com"
              value={registerData.mail}
              onChange={handleRegisterInputChange}
              required
            />
            
            <Input 
              label="Telefon Numarası"
              name="telefon"
              placeholder="05XX XXX XX XX"
              value={registerData.telefon}
              onChange={handleRegisterPhoneChange}
              required
            />

            <Input 
              label="Şirket Adresi (Opsiyonel)"
              name="adres"
              placeholder="Şirket Adresiniz"
              value={registerData.adres}
              onChange={handleRegisterInputChange}
            />

            <div className="input-wrapper">
              <label className="input-label">Şifre</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="sifre"
                  placeholder="Şifreniz (En az 8 karakter)"
                  value={registerData.sifre}
                  onChange={handleRegisterInputChange}
                  className="custom-input"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-wrapper">
              <label className="input-label">Şifre Tekrar</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="sifreTekrar"
                  placeholder="Şifrenizi tekrar girin"
                  value={registerData.sifreTekrar}
                  onChange={handleRegisterInputChange}
                  className="custom-input"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-4" size="lg" disabled={loading}>
              {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
            </Button>

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsRegisteringCompany(false);
                  setError('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Geri Dön ve Giriş Yap
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Registration Success Modal */}
      {registerSuccessModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
          onClick={() => setRegisterSuccessModalOpen(false)}
        >
          <div 
            className="glass-panel animate-fade-in" 
            style={{ maxWidth: '440px', width: '100%', padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={56} style={{ color: '#10b981' }} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Kayıt Başvurunuz Alındı
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Kayıt Başvurunuz Alındı. Yönetimden Onay Bekleniyor. En geç 2 gün içerisinde sizlere mail üzerinden geri dönüş yapılacaktır.
            </p>
            <Button 
              variant="primary" 
              className="w-full" 
              onClick={() => {
                setRegisterSuccessModalOpen(false);
                setIsRegisteringCompany(false);
              }}
            >
              Giriş Ekranına Dön
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
