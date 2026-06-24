import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: '#fee' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
