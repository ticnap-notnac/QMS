import React from 'react';

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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center', 
          fontFamily: 'sans-serif',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '8px',
          margin: '20px auto',
          maxWidth: '500px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '10px' }}>Oops, something went wrong.</h2>
          <p style={{ marginBottom: '20px' }}>We're sorry, but the application encountered an unexpected error.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '10px 20px', 
              cursor: 'pointer', 
              background: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
