import SubmissionLoadingOverlay from '../UI/SubmissionLoadingOverlay.jsx'

export default function ProductTypeModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  productTypeName,
  onProductTypeNameChange,
  availableProducts = [],
  productTypes = [],
  editingProductTypeId,
  selectedProductIds = [],
  onProductToggle,
  loading,
  error,
  message,
  submitLabel,
  helperText,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <SubmissionLoadingOverlay isOpen={loading} message="Saving..." />
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-type-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        <div className="modal-header">
          <h2 id="product-type-modal-title" className="modal-title">
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
            <span className="small-label">Product Type Name: <span style={{ color: '#ef4444' }}>*</span></span>
            <input
              type="text"
              value={productTypeName}
              onChange={onProductTypeNameChange}
              className="form-input-reports"
              placeholder="e.g. Liquid Milk, Powdered Milk, Cream..."
            />
          </label>

          <div className="panel-column" style={{ marginBottom: '20px' }}>
            <span className="small-label" style={{ marginBottom: '8px', display: 'block' }}>
              Assigned Products:
            </span>
            <p className="glass-card-subtext" style={{ marginTop: 0, marginBottom: '8px', fontSize: '13px' }}>
              Select which products belong to this Product Type:
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
              {availableProducts.length === 0 ? (
                <span className="glass-card-subtext" style={{ fontStyle: 'italic' }}>
                  No products available. You can add products in the "Products" tab.
                </span>
              ) : (
                availableProducts.map((prod) => {
                  const isChecked = selectedProductIds.includes(String(prod.id)) || selectedProductIds.includes(Number(prod.id))
                  let assignedText = null
                  if (prod.product_type_id && String(prod.product_type_id) !== String(editingProductTypeId)) {
                    const assignedType = productTypes.find(pt => String(pt.id) === String(prod.product_type_id))
                    if (assignedType) {
                      assignedText = `(Assigned to: ${assignedType.product_type_name})`
                    }
                  }

                  return (
                    <label
                      key={prod.id}
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
                        onChange={() => onProductToggle(String(prod.id))}
                        style={{ accentColor: '#1A435A', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>
                        {prod.product_name}
                        {assignedText && (
                          <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '12px', marginLeft: '6px' }}>
                            {assignedText}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="modal-submit-row">
            <button
              type="button"
              className="btn-secondary-light"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn-gradient-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : (submitLabel || 'Save Product Type')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
