import { useEffect, useState } from 'react'

export default function Toast({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 4000,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
  }, [message])

  useEffect(() => {
    // If it's a confirmation toast, do not auto-dismiss
    if (onConfirm) return

    const timer = setTimeout(() => {
      setVisible(false)
      if (onClose) onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose, onConfirm, message])

  if (!visible) return null

  const handleDismiss = () => {
    setVisible(false)
    if (onClose) onClose()
  }

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
                onClick={handleDismiss}
                className="btn-secondary-light"
                style={{ padding: '4px 12px', fontSize: '12px', minHeight: 'auto', borderRadius: '8px' }}
              >
                {cancelText}
              </button>
            </div>
          )}
        </div>
      </div>
      {!onConfirm && (
        <button className="toast-dismiss-button" onClick={handleDismiss} aria-label="Close notification">
          &times;
        </button>
      )}
    </div>
  )
}