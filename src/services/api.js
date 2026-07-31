import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE_URL = (configuredBaseUrl || '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

export function resolveAssetUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return new URL(normalizedPath, window.location.origin).toString();
}

function getCookie(name) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

// Cookie tabanlı yazma isteklerine CSRF doğrulama başlığını ekle.
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCookie('csrf_token');
      if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new Event('auth-error'));
    }
    return Promise.reject(error);
  }
);

export default api;
