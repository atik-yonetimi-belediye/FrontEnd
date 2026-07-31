import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import { Users, Truck, MapPin } from 'lucide-react';
import './CavusDashboard.css';
import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '../../services/pagination';
import { ContentState } from '../../components/AppState';

const CavusDashboard = () => {
  const navigate = useNavigate();
  const { data, isPending: loading, isError, refetch } = useQuery({
    queryKey: ['cavus', 'dashboard'],
    queryFn: async ({ signal }) => {
      const [profileRes, containers, vehicles, drivers] = await Promise.all([
        api.get('/cavus/me', { signal }),
        fetchAllPages('/cavus/konteynerler', { signal }),
        fetchAllPages('/cavus/araclar', { signal }),
        fetchAllPages('/cavus/soforler', { signal }),
      ]);
      return {
        profile: profileRes.data.data,
        stats: {
          konteyner: containers.filter((item) => item.aktif_mi !== false).length,
          arac: vehicles.filter((item) => item.aktif_mi).length,
          sofor: drivers.filter((item) => item.aktif_mi).length,
        },
      };
    },
  });
  const profile = data?.profile;
  const stats = data?.stats ?? { konteyner: 0, arac: 0, sofor: 0 };

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

  if (isError || !profile) {
    return <DashboardLayout title="Çavuş Özeti"><ContentState type="error" title="Bölge bilgileri yüklenemedi" message="Bağlantınızı kontrol edip yeniden deneyin." onRetry={refetch} /></DashboardLayout>;
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
          <button type="button"
            className="stat-card glass-panel cursor-pointer-card"
            onClick={() => navigate('/cavus/konteynerler')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon info"><MapPin size={28} /></div>
            <div className="stat-info">
              <h4>Konteynerler</h4>
              <h2>{stats.konteyner}</h2>
            </div>
          </button>
          
          <button type="button"
            className="stat-card glass-panel cursor-pointer-card"
            onClick={() => navigate('/cavus/araclar')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon warning"><Truck size={28} /></div>
            <div className="stat-info">
              <h4>Araçlar</h4>
              <h2>{stats.arac}</h2>
            </div>
          </button>
          
          <button type="button"
            className="stat-card glass-panel cursor-pointer-card"
            onClick={() => navigate('/cavus/araclar')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon success"><Users size={28} /></div>
            <div className="stat-info">
              <h4>Şoförler</h4>
              <h2>{stats.sofor}</h2>
            </div>
          </button>
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
