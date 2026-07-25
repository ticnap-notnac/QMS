import { useState, useEffect } from 'react'

export default function RoleModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  roleName,
  onRoleNameChange,
  availablePositions = [],
  selectedPositionIds = [],
  onPositionToggle,
  loading,
  error,
  message,
  submitLabel,
  helperText,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        <div className="modal-header">
          <h2 id="role-modal-title" className="modal-title">
            {title}
          </h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          <p className="glass-card-subtext">{helperText}</p>

          {error && <div className="user-info-error">{error}</div>}
          {message && <div className="user-info-success">{message}</div>}

          <label className="panel-column" style={{ marginBottom: '16px' }}>
            <span className="small-label">ROLE NAME: <span style={{ color: '#ef4444' }}>*</span></span>
            <input
              type="text"
              value={roleName}
              onChange={onRoleNameChange}
              className="form-input-reports"
              placeholder="Enter role name"
            />
          </label>

          <div className="panel-column" style={{ marginBottom: '20px' }}>
            <span className="small-label" style={{ marginBottom: '8px', display: 'block' }}>
              ASSIGNED POSITIONS (JOB TITLES):
            </span>
            <p className="glass-card-subtext" style={{ marginTop: 0, marginBottom: '8px', fontSize: '13px' }}>
              Select which job positions belong to this system role:
            </p>

            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '10px 14px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {availablePositions.length === 0 ? (
                <span className="glass-card-subtext" style={{ fontStyle: 'italic' }}>
                  No positions available. You can add positions in the "Position" tab.
                </span>
              ) : (
                availablePositions.map((pos) => {
                  const isChecked = selectedPositionIds.includes(String(pos.id)) || selectedPositionIds.includes(Number(pos.id))
                  return (
                    <label
                      key={pos.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#1e293b',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onPositionToggle(String(pos.id))}
                        style={{ accentColor: '#0f172a', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>{pos.position_name}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="modal-submit-row">
            <button
              className="btn-add-action"
              type="submit"
              disabled={loading}
              style={{
                background: '#0f172a',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '4px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {loading ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
