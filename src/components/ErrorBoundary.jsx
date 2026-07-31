import React from 'react';
import Button from './Button';
import './ErrorBoundary.css';
import { reportClientError } from '../services/observability';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    reportClientError('error-boundary', error, { componentStack: info?.componentStack?.slice(0, 2000) });
    if (import.meta.env.DEV) console.error('Uygulama hatası:', error, info);
  }
  handleReload = () => window.location.reload();
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main id="main-content" className="fatal-error" tabIndex="-1">
        <div className="fatal-error-card">
          <span className="fatal-error-code" aria-hidden="true">!</span>
          <h1>Bir şeyler beklediğimiz gibi gitmedi</h1>
          <p>Verileriniz korunuyor. Uygulamayı güvenli şekilde yeniden yükleyerek devam edebilirsiniz.</p>
          <Button onClick={this.handleReload}>Uygulamayı Yenile</Button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
