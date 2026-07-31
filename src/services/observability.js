import api from './api';

export function reportClientError(kind, error, details = {}) {
  const payload = { kind, message: String(error?.message || error || 'Bilinmeyen hata').slice(0, 500), stack: typeof error?.stack === 'string' ? error.stack.slice(0, 2000) : undefined, path: window.location.pathname, ...details };
  try {
    const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (!navigator.sendBeacon('/api/client-errors', body)) fetch('/api/client-errors', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch { /* Hata raporlama uygulamanın çalışmasını etkilememeli. */ }
}

export function trackPilotEvent(event, durationMs) {
  api.post('/telemetry', { event, duration_ms: Math.round(durationMs) }).catch(() => {});
}
