import React from 'react'

/**
 * A reusable confirmation dialog modal that replaces native window.confirm().
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {string} title - The title of the modal
 * @param {string|React.ReactNode} message - The main confirmation question/message
 * @param {Function} onConfirm - Callback when the user clicks confirm
 * @param {Function} onCancel - Callback when the user clicks cancel
 * @param {string} [confirmText="Confirm"] - Text for the confirm button
 * @param {string} [cancelText="Cancel"] - Text for the cancel button
 * @param {boolean} [isDestructive=false] - If true, styles the confirm button as a dangerous action (e.g., red)
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-form-content" style={{ padding: '16px 28px 24px 28px' }}>
          <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>{message}</p>
        </div>
        <div className="modal-footer-actions">
          <button 
            type="button" 
            className="btn-secondary-light" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            style={isDestructive ? { background: '#dc2626', borderColor: '#dc2626', color: '#ffffff' } : {}}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
