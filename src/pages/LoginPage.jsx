import React, { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/useAuth';
import { getRoleHomePath } from '../utils/authRoutes';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [credentials, setCredentials] = useState({
    identifier: '',
    sifre: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (user?.role) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await login({
      identifier: credentials.identifier.trim(),
      sifre: credentials.sifre,
    });

    if (result.success) {
      navigate(getRoleHomePath(result.user.role), { replace: true });
      return;
    }

    setError(result.message);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <main className="login-container glass-panel animate-fade-in" id="main-content" tabIndex={-1}>
        <Link to="/" className="login-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Ana Sayfaya Dön
        </Link>

        <header className="login-header">
          <h1>Onikişubat Belediyesi</h1>
          <p>Atık Yönetim Sistemi – Giriş</p>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="Telefon Numarası veya Kullanıcı Adı"
            name="identifier"
            type="text"
            placeholder="Telefon numaranız veya kullanıcı adınız"
            value={credentials.identifier}
            onChange={handleInputChange}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            required
            autoFocus
          />

          <div className="input-wrapper">
            <label className="input-label" htmlFor="login-password">
              Şifre
            </label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="sifre"
                placeholder="Şifreniz"
                value={credentials.sifre}
                onChange={handleInputChange}
                className="custom-input"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full login-submit"
            size="lg"
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default LoginPage;
