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
      <div className="modal-content confirm-modal">
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
