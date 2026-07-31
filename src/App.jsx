import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

// Public Immediate Loaded Pages
import LandingPage from './pages/LandingPage';
import ComplaintForm from './pages/ComplaintForm';
import LoginPage from './pages/LoginPage';

// Dynamic Lazy Loaded Subpages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMap = lazy(() => import('./pages/admin/AdminMap'));
const AdminSikayetler = lazy(() => import('./pages/admin/AdminSikayetler'));
const AdminSirketler = lazy(() => import('./pages/admin/AdminSirketler'));
const AdminPersonel = lazy(() => import('./pages/admin/AdminPersonel'));
const AdminGeriDonusum = lazy(() => import('./pages/admin/AdminGeriDonusum'));

const CavusDashboard = lazy(() => import('./pages/cavus/CavusDashboard'));
const CavusKonteynerler = lazy(() => import('./pages/cavus/CavusKonteynerler'));
const CavusAraclar = lazy(() => import('./pages/cavus/CavusAraclar'));

const SoforDashboard = lazy(() => import('./pages/sofor/SoforDashboard'));
const SirketDashboard = lazy(() => import('./pages/sirket/SirketDashboard'));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    height: '100vh',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--primary-color)',
    fontWeight: 600,
    fontSize: '1.1rem'
  }}>
    <div className="animate-fade-in">Yükleniyor...</div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sikayet-olustur" element={<ComplaintForm />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/harita" element={<ProtectedRoute allowedRoles={['admin']}><AdminMap /></ProtectedRoute>} />
        <Route path="/admin/sikayetler" element={<ProtectedRoute allowedRoles={['admin']}><AdminSikayetler /></ProtectedRoute>} />
        <Route path="/admin/sirketler" element={<ProtectedRoute allowedRoles={['admin']}><AdminSirketler /></ProtectedRoute>} />
        <Route path="/admin/personel" element={<ProtectedRoute allowedRoles={['admin']}><AdminPersonel /></ProtectedRoute>} />
        <Route path="/admin/geri-donusum" element={<ProtectedRoute allowedRoles={['admin']}><AdminGeriDonusum /></ProtectedRoute>} />
        
        <Route path="/cavus" element={<ProtectedRoute allowedRoles={['cavus']}><CavusDashboard /></ProtectedRoute>} />
        <Route path="/cavus/konteynerler" element={<ProtectedRoute allowedRoles={['cavus']}><CavusKonteynerler /></ProtectedRoute>} />
        <Route path="/cavus/araclar" element={<ProtectedRoute allowedRoles={['cavus']}><CavusAraclar /></ProtectedRoute>} />
        
        <Route path="/sofor" element={<ProtectedRoute allowedRoles={['sofor']}><SoforDashboard /></ProtectedRoute>} />
        <Route path="/sirket" element={<ProtectedRoute allowedRoles={['sirket']}><SirketDashboard /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

import { ToastProvider } from './components/ToastContext';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
