import { useEffect } from 'react'

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    // Automatically triggers the onClose callback after the duration timer ends
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className={`toast-alert-card toast-status--${type}`}>
      <div className="toast-inner-cluster">
        <span className="toast-indicator-icon">
          {type === 'success' && '🔹'}
          {type === 'error' && '🔸'}
          {type === 'info' && '🔹'}
        </span>
        <p className="toast-body-text">{message}</p>
      </div>
      <button className="toast-dismiss-button" onClick={onClose} aria-label="Close notification">
        &times;
      </button>
    </div>
  )
}