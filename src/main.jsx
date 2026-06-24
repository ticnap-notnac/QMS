import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Global error logging telemetry
const logErrorToBackend = (errorData) => {
  try {
    fetch('/api/logs/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...errorData,
        userAgent: navigator.userAgent,
        path: window.location.pathname
      })
    }).catch(() => { /* Ignore failure to log error */ })
  } catch (e) {
    // Silent
  }
}

window.onerror = function (message, source, lineno, colno, error) {
  logErrorToBackend({ message, source, lineno, colno, error: error?.stack || error })
}

window.addEventListener('unhandledrejection', function (event) {
  logErrorToBackend({ message: 'Unhandled Promise Rejection', error: event.reason?.stack || event.reason })
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
