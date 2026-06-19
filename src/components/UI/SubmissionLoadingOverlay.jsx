import React from 'react'
import '../components.css'

export default function SubmissionLoadingOverlay({ isOpen, message }) {
  if (!isOpen) return null

  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-spinner" aria-hidden="true" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  )
}
