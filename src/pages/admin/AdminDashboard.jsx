import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';
import { Users, Truck, Map, AlertTriangle, TrendingUp, Clock, CheckCircle2, Building } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.data.success) {
          setDashboardData(res.data.data);
        }
      } catch (err) {
        console.error("Yönetici özeti verisi alınamadı", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Yönetici Özeti">
        <div className="stats-grid">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="stat-card glass-panel" style={{ height: '90px', display: 'flex', alignItems: 'center', padding: '1rem' }}>
              <div className="skeleton skeleton-circle" style={{ marginRight: '1rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '45%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '75%', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }
  if (!dashboardData) return <DashboardLayout title="Yönetici Özeti"><p>Veriler yüklenirken bir sorun oluştu.</p></DashboardLayout>;

  const {
    konteynerler,
    cavuslar,
    soforler,
    sirketler,
    sikayetler
  } = dashboardData;

  // Chart Data Preparation
  const sikayetDurumlari = [
    { name: 'Bekleyen', value: parseInt(sikayetler.bekleyen_sikayet || 0), color: '#ef4444' },
    { name: 'İnceleniyor', value: parseInt(sikayetler.incelenen_sikayet || 0), color: '#f59e0b' },
    { name: 'Çözüldü', value: parseInt(sikayetler.cozulen_sikayet || 0), color: '#10b981' },
    { name: 'Reddedildi', value: parseInt(sikayetler.reddedilen_sikayet || 0), color: '#6b7280' }
  ].filter(d => d.value > 0);

  const konteynerTurleri = [
    { name: 'Katı Atık', Adet: parseInt(konteynerler.kati_atik_konteyner || 0) },
    { name: 'Geri Dönüşüm', Adet: parseInt(konteynerler.geri_donusum_konteyner || 0) }
  ];

  const totalPersonnel = Number(cavuslar.toplam_cavus) + Number(soforler.toplam_sofor);
  const activePersonnel = Number(cavuslar.aktif_cavus) + Number(soforler.aktif_sofor);
  const personnelRate = totalPersonnel ? Math.round((activePersonnel / totalPersonnel) * 100) : 0;
  const containerRate = Number(konteynerler.toplam_konteyner)
    ? Math.round((Number(konteynerler.aktif_konteyner) / Number(konteynerler.toplam_konteyner)) * 100)
    : 0;
  const complaintRate = Number(sikayetler.toplam_sikayet)
    ? Math.round((Number(sikayetler.cozulen_sikayet) / Number(sikayetler.toplam_sikayet)) * 100)
    : 0;

  const getActivityIcon = (type) => {
    if (type === 'collection') return <CheckCircle2 size={18} style={{ color: '#10b981' }} />;
    if (type === 'complaint') return <AlertTriangle size={18} style={{ color: '#ef4444' }} />;
    return <Building size={18} style={{ color: '#3b82f6' }} />;
  };

  return (
    <DashboardLayout title="Yönetici Özeti">
      <div className="stats-grid">
        <div 
          className="stat-card glass-panel cursor-pointer-card" 
          onClick={() => navigate('/admin/personel')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-details">
            <h3>Personel Kadrosu</h3>
            <p>{cavuslar.aktif_cavus || 0} Çavuş, {soforler.aktif_sofor || 0} Şoför</p>
            <span className="trend-badge up"><TrendingUp size={12} /> %{personnelRate} Aktif Kadro</span>
          </div>
        </div>

        <div 
          className="stat-card glass-panel cursor-pointer-card" 
          onClick={() => navigate('/admin/harita')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon"><Map size={24} /></div>
          <div className="stat-details">
            <h3>Saha Konteynerleri</h3>
            <p>{konteynerler.toplam_konteyner || 0} Toplam ({konteynerler.aktif_konteyner || 0} Aktif)</p>
            <span className="trend-badge up"><TrendingUp size={12} /> %{containerRate} Aktif</span>
          </div>
        </div>

        <div 
          className="stat-card glass-panel cursor-pointer-card" 
          onClick={() => navigate('/admin/sirketler')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon"><Truck size={24} /></div>
          <div className="stat-details">
            <h3>Şirket Onayları</h3>
            <p>{sirketler.bekleyen_sirket || 0} Bekleyen Başvuru</p>
            <span className="trend-badge down">⏳ İnceleniyor</span>
          </div>
        </div>

        <div 
          className="stat-card glass-panel cursor-pointer-card" 
          onClick={() => navigate('/admin/sikayetler')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon" style={{background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)'}}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-details">
            <h3>Şikayet Durumu</h3>
            <p>{sikayetler.toplam_sikayet || 0} Toplam ({sikayetler.bekleyen_sikayet || 0} Bekleyen)</p>
            <span className="trend-badge up"><TrendingUp size={12} /> %{complaintRate} Çözüm Oranı</span>
          </div>
        </div>
      </div>

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        
        {/* Şikayet Dağılımı (Pie Chart) */}
        <div className="chart-container glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '1.05rem' }}>Şikayet Dağılımı</h3>
          {sikayetDurumlari.length > 0 ? (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie 
                    data={sikayetDurumlari} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="45%" 
                    outerRadius={70} 
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {sikayetDurumlari.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Adet']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted" style={{textAlign: 'center', lineHeight: '220px'}}>Henüz şikayet bulunmuyor.</p>
          )}
        </div>

        {/* Konteyner Dağılımı (Bar Chart) */}
        <div className="chart-container glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '1.05rem' }}>Konteyner Türleri</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={konteynerTurleri}>
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#e2e8f0', fontSize: 12 }} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(value) => [value, 'Adet']} 
                />
                <Bar dataKey="Adet" fill="var(--primary-color)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Recent Activity Timeline */}
      <div className="timeline-section glass-panel p-4" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} style={{ color: 'var(--primary-color)' }} /> Son Sistem Hareketleri
        </h3>

        <div className="timeline-list">
          {(dashboardData.recent_activities || []).map(act => (
            <div key={`${act.type}-${act.id}`} className="timeline-item">
              <div className="timeline-icon">{getActivityIcon(act.type)}</div>
              <div className="timeline-content">
                <p className="timeline-title">{act.description}</p>
                <span className="timeline-time">
                  {new Date(act.event_time).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>
          ))}
          {(dashboardData.recent_activities || []).length === 0 && (
            <p className="text-muted">Henüz sistem hareketi bulunmuyor.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
