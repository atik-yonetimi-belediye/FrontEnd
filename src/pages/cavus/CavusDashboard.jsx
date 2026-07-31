import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import { Users, Truck, MapPin } from 'lucide-react';
import './CavusDashboard.css';

const CavusDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ konteyner: 0, arac: 0, sofor: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, containersRes, vehiclesRes, driversRes] = await Promise.all([
          api.get('/cavus/me'),
          api.get('/cavus/konteynerler', { params: { limit: 200 } }),
          api.get('/cavus/araclar', { params: { limit: 200 } }),
          api.get('/cavus/soforler', { params: { limit: 200 } })
        ]);

        if (profileRes.data.success) {
          setProfile(profileRes.data.data);
        }

        const activeContainers = containersRes.data.success ? containersRes.data.data.filter(k => k.aktif_mi !== false) : [];
        const activeVehicles = vehiclesRes.data.success ? vehiclesRes.data.data.filter(a => a.aktif_mi) : [];
        const activeDrivers = driversRes.data.success ? driversRes.data.data.filter(s => s.aktif_mi) : [];

        setStats({
          konteyner: activeContainers.length,
          arac: activeVehicles.length,
          sofor: activeDrivers.length
        });
      } catch (err) {
        console.error("Veriler yüklenemedi", err);
        setProfile({ ad_soyad: 'Çavuş', mahalle_ad: 'Haydarbey' });
        setStats({ konteyner: 0, arac: 0, sofor: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Bölge Özeti">
        <div className="cavus-welcome-banner glass-panel mb-4" style={{ height: '140px', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="skeleton skeleton-title" style={{ width: '40%', height: '24px', marginBottom: '12px' }} />
          <div className="skeleton skeleton-text" style={{ width: '70%', height: '14px' }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3].map(n => (
            <div key={n} className="stat-card glass-panel" style={{ height: '90px', display: 'flex', alignItems: 'center', padding: '1rem' }}>
              <div className="skeleton skeleton-circle" style={{ marginRight: '1rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '45%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '60%', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Çavuş Özeti">
      <div className="cavus-dashboard">
        
        <div className="welcome-banner glass-panel">
          <div>
            <h2 className="mb-2">Merhaba, {profile?.ad_soyad}</h2>
            <p className="text-muted">
              Sorumlu olduğunuz <strong>{profile?.mahalle_ad}</strong> mahallesi için güncel durum aşağıdadır.
            </p>
          </div>
          <div className="mahalle-badge">
            <MapPin size={24} /> {profile?.mahalle_ad}
          </div>
        </div>

        <div className="stats-grid mt-4">
          <div 
            className="stat-card glass-panel cursor-pointer-card"
            onClick={() => navigate('/cavus/konteynerler')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon info"><MapPin size={28} /></div>
            <div className="stat-info">
              <h4>Konteynerler</h4>
              <h2>{stats.konteyner}</h2>
            </div>
          </div>
          
          <div 
            className="stat-card glass-panel cursor-pointer-card"
            onClick={() => navigate('/cavus/araclar')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon warning"><Truck size={28} /></div>
            <div className="stat-info">
              <h4>Araçlar</h4>
              <h2>{stats.arac}</h2>
            </div>
          </div>
          
          <div 
            className="stat-card glass-panel cursor-pointer-card"
            onClick={() => navigate('/cavus/araclar')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon success"><Users size={28} /></div>
            <div className="stat-info">
              <h4>Şoförler</h4>
              <h2>{stats.sofor}</h2>
            </div>
          </div>
        </div>

        <div className="dashboard-sections mt-4">
          <div className="glass-panel p-4">
            <h3>Hızlı İşlemler</h3>
            <div className="quick-actions">
              <button onClick={() => navigate('/cavus/konteynerler')} className="quick-action-btn">Konteyner Yönetimi (Ekle)</button>
              <button onClick={() => navigate('/cavus/araclar')} className="quick-action-btn">Araç Yönetimi</button>
              <button onClick={() => navigate('/cavus/araclar')} className="quick-action-btn">Şoför Yönetimi</button>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default CavusDashboard;
