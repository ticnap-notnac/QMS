import React from 'react';
import { logAction } from '@/services/logService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Log the error to the backend
    try {
      logAction({
        level: 'error',
        source: 'frontend_error_boundary',
        action: 'react_component_crash',
        details: {
          message: error?.message || String(error),
          stack: error?.stack,
          componentStack: errorInfo?.componentStack
        }
      }).catch(err => {
        console.error("Failed to log ErrorBoundary error to backend:", err);
      });
    } catch (e) {
      console.error("Logging failed:", e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          padding: '40px 20px',
        }}>
          <div style={{ 
            textAlign: 'center', 
            fontFamily: 'sans-serif',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 'bold' }}>Something went wrong on this page.</h2>
            <p style={{ marginBottom: '24px', fontSize: '14px', color: '#64748b' }}>
              This is usually a temporary issue. Try refreshing the page.<br />
              If the problem keeps happening, please contact your system administrator.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ 
                  padding: '10px 20px', 
                  cursor: 'pointer', 
                  background: '#0f172a', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}
              >
                Reload Page
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                style={{ 
                  padding: '10px 20px', 
                  cursor: 'pointer', 
                  background: '#f1f5f9', 
                  color: '#0f172a', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
