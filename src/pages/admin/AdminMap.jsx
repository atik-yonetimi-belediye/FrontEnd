import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchAllPages } from '../../services/pagination';
import 'leaflet/dist/leaflet.css';
import './AdminMap.css';

// Custom icons using DivIcon for a premium look
const createIcon = (type) => {
  const color = type === 'geri_donusum' ? '#10b981' : '#3b82f6';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const MAP_TILES = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB Voyager'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB Dark Matter'
  }
};

const AdminMap = () => {
  const [konteynerler, setKonteynerler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState('voyager'); // 'voyager' | 'satellite' | 'dark'

  // Default center (Kahramanmaraş coordinates)
  const center = [37.5858, 36.9145];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setKonteynerler(await fetchAllPages('/konteynerler', { params: { aktif_mi: true } }));
        
      } catch (err) {
        console.error("Harita verisi yüklenemedi", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <DashboardLayout title="Konteyner Haritası">
      <div className="admin-map-container glass-panel">
        
        {/* Tile Layer Switcher */}
        <div className="map-style-switcher">
          <button 
            className={`map-style-btn ${mapStyle === 'voyager' ? 'active' : ''}`}
            onClick={() => setMapStyle('voyager')}
          >
            🗺️ Sokak
          </button>
          <button 
            className={`map-style-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapStyle('satellite')}
          >
            🛰️ Uydu
          </button>
          <button 
            className={`map-style-btn ${mapStyle === 'dark' ? 'active' : ''}`}
            onClick={() => setMapStyle('dark')}
          >
            🌙 Gece
          </button>
        </div>

        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#3b82f6'}}></span> Katı Atık Konteyneri
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#10b981'}}></span> Geri Dönüşüm Konteyneri
          </div>
          <div className="legend-item">Araç konum takibi henüz etkin değil.</div>
        </div>
        
        {loading ? (
          <div className="map-loading">Harita Yükleniyor...</div>
        ) : (
          <MapContainer center={center} zoom={14} className="map-view">
            <TileLayer
              attribution={MAP_TILES[mapStyle].attribution}
              url={MAP_TILES[mapStyle].url}
            />
            
            {/* Containers */}
            {konteynerler.map(k => (
              k.latitude && k.longitude && (
                <Marker 
                  key={`k-${k.id}`} 
                  position={[k.latitude, k.longitude]}
                  icon={createIcon(k.tur)}
                  title={`${k.konteyner_kodu} konteyneri`}
                  alt={`${k.konteyner_kodu} konteyneri`}
                >
                    <Popup className="custom-popup">
                      <div className="popup-content">
                        <div>
                          <strong className="popup-title">{k.konteyner_kodu}</strong>
                          <span className="popup-badge" style={{color: '#fff', backgroundColor: k.tur === 'geri_donusum' ? '#10b981' : '#3b82f6', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontSize: '0.75rem', fontWeight: 600}}>{k.tur === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık'}</span>
                        </div>
                        <p className="popup-mahalle">{k.mahalle_ad} Mahallesi</p>
                        <p className="popup-time">
                          ⏰ <strong>Son Toplanma:</strong><br/>
                          {k.son_toplanma_tarihi ? new Date(k.son_toplanma_tarihi).toLocaleString('tr-TR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'Hiç toplanmadı'}
                        </p>
                      </div>
                    </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminMap;
