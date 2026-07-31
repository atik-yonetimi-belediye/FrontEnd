import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, AlertTriangle, LogIn, Recycle, MapPin, Sun, Moon, Trees, Zap, Award, Compass, Navigation } from 'lucide-react';
import Button from '../components/Button';
import api from '../services/api';
import './LandingPage.css';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap';
import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '../services/pagination';

const LandingPage = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [locatorOpen, setLocatorOpen] = useState(false);
  const [nearestContainer, setNearestContainer] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const locatorDialogRef = useRef(null);
  const emptyStats = {
    aktif_konteyner: 0,
    bugun_toplanan: 0,
    cozulen_sikayet: 0,
    tamamlanan_geri_donusum_talebi: 0,
    tamamlanan_tahmini_miktar: 0
  };
  const { data: pageData = { containers: [], stats: emptyStats } } = useQuery({
    queryKey: ['public', 'landing'],
    queryFn: async ({ signal }) => {
      const [containers, statsResponse] = await Promise.all([
        fetchAllPages('/konteynerler', { params: { aktif_mi: true }, signal }),
        api.get('/public/stats', { signal }),
      ]);
      return { containers, stats: statsResponse.data?.data ?? emptyStats };
    },
  });
  const { containers, stats } = pageData;
  useDialogFocusTrap(locatorDialogRef, locatorOpen, () => setLocatorOpen(false));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleFindNearestContainer = () => {
    setLocatorOpen(true);
    setLocating(true);
    setLocationError('');
    setNearestContainer(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Calculate nearest container using Haversine formula
          if (containers.length > 0) {
            let minDistance = Infinity;
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
                const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                if (distance < minDistance) {
                  minDistance = distance;
                  closest = { ...c, distanceKm: distance.toFixed(2) };
                }
              }
            });

            setNearestContainer(closest);
          }
          setLocating(false);
        },
        () => {
          setLocationError(
            'Konum izni alınamadı. Tarayıcı ayarlarından konum izni verip yeniden deneyin.'
          );
          setLocating(false);
        }
      );
    } else {
      setLocationError('Tarayıcınız konum özelliğini desteklemiyor.');
      setLocating(false);
    }
  };

  const openNavigation = (c) => {
    if (!c) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="landing-container animate-fade-in">
      {/* Navbar */}
      <header className="landing-header flex-between">
        <div className="logo-container">
          <div className="logo-icon-bg">
            <Leaf className="logo-icon" size={24} />
          </div>
          <span className="logo-text">Onikişubat Bld. Atık Yönetimi</span>
        </div>
        <div className="header-actions" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Tema Değiştir" aria-label={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Button as={Link} to="/login" variant="primary" size="sm" className="login-link">
            <LogIn size={16} /> Giriş Yap
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero-section" id="main-content" tabIndex={-1}>
        <div className="hero-content glass-panel">
          <div className="badge">🌱 Temiz Bir Çevre & Akıllı Şehir</div>
          <h1 className="hero-title">
            Çevrenizi Korumak <br /> <span className="text-gradient">Sizin Elinizde</span>
          </h1>
          <p className="hero-subtitle">
            Mahallenizdeki çöp konteynerleri ile ilgili sorunları anında belediyemize bildirin, 
            geri dönüşüm ve sıfır atık seferberliğine siz de katılın!
          </p>
          
          <div className="hero-buttons">
            <Button as={Link} to="/sikayet-olustur" variant="primary" size="lg" className="hero-btn shadow-hover">
              <AlertTriangle size={20} /> Şikayet Bildir
            </Button>
            
            <Button variant="outline" size="lg" className="hero-btn" onClick={handleFindNearestContainer}>
              <Compass size={20} /> En Yakın Konteyneri Bul
            </Button>
          </div>
        </div>
      </main>

      {/* Live Environmental Impact Stats Section */}
      <section className="impact-section container mb-5">
        <div className="section-header text-center" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Çevresel Etki Tablomuz</h2>
          <p className="text-muted">Onikişubat halkı ve belediyemiz el ele, geleceği dönüştürüyor.</p>
        </div>

        <div className="impact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="impact-card glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div className="impact-icon" style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Recycle size={36} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-primary)' }}>
              {stats.tamamlanan_tahmini_miktar.toLocaleString('tr-TR')} kg
            </h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Tamamlanan Tahmini Geri Dönüşüm</p>
          </div>

          <div className="impact-card glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div className="impact-icon" style={{ color: '#059669', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Trees size={36} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-primary)' }}>{stats.aktif_konteyner}</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Aktif Konteyner</p>
          </div>

          <div className="impact-card glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div className="impact-icon" style={{ color: '#3b82f6', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Award size={36} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-primary)' }}>{stats.cozulen_sikayet}</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Çözülen Şikâyet</p>
          </div>

          <div className="impact-card glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div className="impact-icon" style={{ color: '#f59e0b', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Zap size={36} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-primary)' }}>{stats.bugun_toplanan}</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Bugün Toplanan Konteyner</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section container">
        <div className="feature-card">
          <div className="feature-icon-wrapper"><MapPin size={24}/></div>
          <h3>Konum Bazlı Takip</h3>
          <p>Aktif konteynerlerin kayıtlı konumları harita üzerinde görüntülenir.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrapper"><AlertTriangle size={24}/></div>
          <h3>Hızlı Çözüm</h3>
          <p>Şikâyetleriniz belediye yönetim ekranına güvenli şekilde iletilir.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrapper"><Recycle size={24}/></div>
          <h3>Geri Dönüşüm</h3>
          <p>Atıklarınızı ayrıştırarak doğaya katkıda bulunun.</p>
        </div>
      </section>

      {/* Nearest Container Modal */}
      {locatorOpen && (
        <div className="modal-backdrop" onClick={() => setLocatorOpen(false)}>
          <div
            ref={locatorDialogRef}
            className="modal-window animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="locator-dialog-title"
            tabIndex={-1}
          >
            <h3 id="locator-dialog-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Compass size={24} style={{ color: 'var(--primary-color)' }} /> En Yakın Konteyner
            </h3>
            
            {locating ? (
              <p className="py-4" id="locator-dialog-status" role="status" aria-live="polite">Konumunuz ve en yakın konteyner tespiti yapılıyor...</p>
            ) : locationError ? (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p className="text-danger">{locationError}</p>
                <Button variant="outline" onClick={() => setLocatorOpen(false)}>Kapat</Button>
              </div>
            ) : nearestContainer ? (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <div className="glass-panel p-3 mb-3" style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{nearestContainer.konteyner_kodu}</h4>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>{nearestContainer.mahalle_ad} Mahallesi</p>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>
                    Tür: {nearestContainer.tur === 'geri_donusum' ? '♻️ Geri Dönüşüm' : '🗑️ Katı Atık (Çöp)'}
                  </p>
                  <div style={{ marginTop: '0.75rem', fontWeight: 700, color: 'var(--success-color)' }}>
                    Aralıktaki Mesafe: ~{nearestContainer.distanceKm} km
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <Button variant="outline" className="w-full" onClick={() => setLocatorOpen(false)}>Kapat</Button>
                  <Button variant="primary" className="w-full" onClick={() => openNavigation(nearestContainer)}>
                    <Navigation size={16} /> Navigasyon Başlat
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted">Konteyner konumu tespit edilemedi.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
