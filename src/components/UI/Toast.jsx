import { useEffect } from 'react'

export default function Toast({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 4000,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) {
  useEffect(() => {
    // If it's a confirmation toast, do not auto-dismiss
    if (onConfirm) return

    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose, onConfirm])

  return (
    <div className={`toast-alert-card toast-status--${type}`}>
      <div className="toast-inner-cluster">
        <span className="toast-indicator-icon">
          {type === 'success' && '🔹'}
          {type === 'error' && '🔸'}
          {type === 'info' && '🔹'}
        </span>
        <div className="toast-body-text" style={{ flex: 1 }}>
          <p style={{ margin: 0 }}>{message}</p>
          {onConfirm && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button 
                onClick={onConfirm}
                className="btn-gradient-primary"
                style={{ padding: '4px 12px', fontSize: '12px', minHeight: 'auto' }}
              >
                {confirmText}
              </button>
              <button 
                onClick={onClose}
                className="btn btn--ghost"
                style={{ padding: '4px 12px', fontSize: '12px', minHeight: 'auto' }}
              >
                {cancelText}
              </button>
            </div>
          )}
        </div>
      </div>
      {!onConfirm && (
        <button className="toast-dismiss-button" onClick={onClose} aria-label="Close notification">
          &times;
        </button>
      )}
    </div>
  )
}