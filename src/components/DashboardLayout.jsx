import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Settings, Map, FileText, Users, Truck, Sun, Moon, Recycle, Menu, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import ConfirmModal from './ConfirmModal';
import './DashboardLayout.css';

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getMenuLinks = () => {
    switch(user?.role) {
      case 'admin':
        return [
          { name: 'Özet', path: '/admin', icon: <Home size={20} /> },
          { name: 'Konteyner Haritası', path: '/admin/harita', icon: <Map size={20} /> },
          { name: 'Şikayetler', path: '/admin/sikayetler', icon: <FileText size={20} /> },
          { name: 'Şirket Onayları', path: '/admin/sirketler', icon: <Settings size={20} /> },
          { name: 'Personel', path: '/admin/personel', icon: <Users size={20} /> },
          { name: 'Geri Dönüşüm', path: '/admin/geri-donusum', icon: <Recycle size={20} /> },
        ];
      case 'cavus':
        return [
          { name: 'Özet', path: '/cavus', icon: <Home size={20} /> },
          { name: 'Konteynerlerim', path: '/cavus/konteynerler', icon: <Map size={20} /> },
          { name: 'Araç / Şoför', path: '/cavus/araclar', icon: <Truck size={20} /> },
        ];
      case 'sofor':
        return [
          { name: 'Görevler', path: '/sofor', icon: <Home size={20} /> },
        ];
      case 'sirket':
        return [
          { name: 'Taleplerim', path: '/sirket', icon: <Home size={20} /> },
        ];
      default:
        return [];
    }
  };

  const avatarLetter = (user?.ad_soyad?.charAt(0) || user?.ad?.charAt(0) || user?.kullanici_adi?.charAt(0) || 'U').toUpperCase();

  return (
    <div className="dashboard-container">
      
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{textAlign: 'center', position: 'relative'}}>
          <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
          <h3 style={{fontSize: '1.1rem', margin: 0, paddingBottom: '5px'}}>Onikişubat Bld.</h3>
          <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Atık Yönetimi</span>
          <br/>
          <span className="role-badge">{user?.role}</span>
        </div>
        
        <nav className="sidebar-nav">
          {getMenuLinks().map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.name} 
                to={link.path} 
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.icon} <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setLogoutConfirmOpen(true)}>
            <LogOut size={20} /> <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="hamburger-btn" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Menüyü Aç"
            >
              <Menu size={22} />
            </button>
            <h2 className="header-title">{title}</h2>
          </div>

          <div className="user-info" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Tema Değiştir">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="avatar" title={user?.ad_soyad || user?.kullanici_adi}>{avatarLetter}</div>
          </div>
        </header>
        
        <div className="dashboard-content animate-fade-in">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={logoutConfirmOpen}
        title="Oturumu Kapat"
        message="Sistemden çıkış yapmak istediğinize emin misiniz?"
        confirmText="Çıkış Yap"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
