function AddCategoryModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  value,
  onChange,
  placeholder,
  loading,
  error,
  message,
  submitLabel,
  helperText,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-category-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="add-category-title" className="modal-title">
            {title}
          </h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()} dialog`}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          <p className="glass-card-subtext">
            {helperText}
          </p>

          {error && <div className="user-info-error">{error}</div>}
          {message && <div className="user-info-success">{message}</div>}

          <label className="panel-column">
            <span className="small-label">{label ? (label.endsWith(':') ? label : `${label}:`) : ''}</span>
            <input
              type="text"
              value={value}
              onChange={onChange}
              className="form-input-reports"
              placeholder={placeholder}
            />
          </label>

          <div className="modal-submit-row">
            <button className="btn-add-action" type="submit" disabled={loading} style={{ background: '#0f172a', border: 'none', padding: '8px 24px', borderRadius: '4px', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddCategoryModal