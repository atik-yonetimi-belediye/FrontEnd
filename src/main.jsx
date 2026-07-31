import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { reportClientError } from './services/observability'

const initialTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', initialTheme)

window.addEventListener('error', (event) => reportClientError('window-error', event.error || event.message))
window.addEventListener('unhandledrejection', (event) => reportClientError('unhandled-rejection', event.reason))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
