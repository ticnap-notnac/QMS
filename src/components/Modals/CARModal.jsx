import { useState } from 'react'
import { X as CloseIcon } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'

function CARModal({
  isOpen,
  onClose,
  form,
  handleChange,
  toggleNcrSelection,
  error,
  isSubmitting,
  onSubmit,
  departments,
  departmentsLoading,
  users,
  usersLoading,
  allReports
}) {
  const [isLinkingMode, setIsLinkingMode] = useState(false)
  const [ncrSearchQuery, setNcrSearchQuery] = useState('')

  if (!isOpen) return null

  const checkboxFields = [
    { key: 'quality_food_safety', label: 'QUALITY/FOOD SAFETY ISSUE' },
    { key: 'environment_health_safety', label: 'ENVIRONMENT, HEALTH AND SAFETY ISSUE' },
    { key: 'security_issue', label: 'SECURITY ISSUE' },
    { key: 'internal_audit', label: 'INTERNAL AUDIT' },
    { key: 'customer_complaint', label: 'CUSTOMER COMPLAINT' },
    { key: 'government_agency_audit', label: 'GOVERNMENT AGENCY AUDIT NON-CONFORMANCE' },
    { key: 'customer_audit_nonconformance', label: 'CUSTOMER AUDIT NON-CONFORMANCE' },
    { key: 'vendor_nonconformance', label: 'VENDOR NON-CONFORMANCE' }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '90vh',
          width: isLinkingMode ? '600px' : '800px',
          maxWidth: '95vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <button type="button" onClick={onClose} className="modal-close-button" style={{ zIndex: 10 }}>
          <CloseIcon size={18} />
        </button>
        <div className="modal-header-row" style={{ flexShrink: 0, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="reports-update-title">{isLinkingMode ? 'Select NCRs to Link' : 'Corrective Action Request (CAR)'}</h3>
          {!isLinkingMode && (
            <button type="button" className="btn-secondary-light" onClick={() => setIsLinkingMode(true)}>
              {form.ncr_ids?.length > 0 ? `Linked NCRs: ${form.ncr_ids.length} (Change)` : 'Link NCR'}
            </button>
          )}
        </div>

        {error && !isLinkingMode && <div className="user-info-error" style={{ marginBottom: '12px', flexShrink: 0 }}>{error}</div>}

        <div className="modal-form-content" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {isLinkingMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Search reference no..."
                value={ncrSearchQuery}
                onChange={(e) => setNcrSearchQuery(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allReports
                  .filter(r => !ncrSearchQuery || String(r.reference_no || r.id).toLowerCase().includes(ncrSearchQuery.toLowerCase()))
                  .map(report => {
                    const isSelected = form.ncr_ids?.includes(String(report.id));
                    return (
                      <label 
                        key={report.id}
                        style={{
                          padding: '12px',
                          background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNcrSelection(report.id, report.reference_no || String(report.id))}
                          style={{ marginTop: '4px' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{report.reference_no || `NCR #${report.id}`}</span>
                            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                          {report.description && (
                            <span style={{ color: 'var(--muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {report.description}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
          ) : (
          <form className="modal-form" onSubmit={onSubmit} style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Requesting Department:"
                  value={form.requesting_department}
                  onValueChange={(val) => handleChange('requesting_department', val)}
                  options={departments}
                  loading={departmentsLoading}
                  placeholder="Search department..."
                  onSelectOption={(opt) => handleChange('requesting_department', opt.label)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Requestor:"
                  value={form.requestor}
                  onValueChange={(val) => handleChange('requestor', val)}
                  options={users}
                  loading={usersLoading}
                  placeholder="Search user..."
                  onSelectOption={(opt) => handleChange('requestor', opt.label)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Date:</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Responsible Department:"
                  value={form.responsible_department}
                  onValueChange={(val) => handleChange('responsible_department', val)}
                  options={departments}
                  loading={departmentsLoading}
                  placeholder="Search department..."
                  onSelectOption={(opt) => handleChange('responsible_department', opt.label)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Recipient:"
                  value={form.recipient}
                  onValueChange={(val) => handleChange('recipient', val)}
                  options={users}
                  loading={usersLoading}
                  placeholder="Search user..."
                  onSelectOption={(opt) => handleChange('recipient', opt.label)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '8px' }}>
              <label className="label-field" style={{ margin: 0 }}>Reason for Re-issue:</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.no_reply}
                  onChange={(e) => handleChange('no_reply', e.target.checked)}
                /> No Reply
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.re_corrective_action}
                  onChange={(e) => handleChange('re_corrective_action', e.target.checked)}
                /> Re-Corrective Action
              </label>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />

            <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 8px 0', textAlign: 'center' }}>TYPE OF NON-CONFORMANCE</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checkboxFields.map(field => (
                  <label key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.checked)}
                    /> {field.label}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Product / Material Name:</label>
                  <input type="text" value={form.product_material_name} onChange={(e) => handleChange('product_material_name', e.target.value)} className="input-field" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Model / Type:</label>
                  <input type="text" value={form.model_type} onChange={(e) => handleChange('model_type', e.target.value)} className="input-field" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Control No.:</label>
                  <input type="text" value={form.control_no} onChange={(e) => handleChange('control_no', e.target.value)} className="input-field" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Affected Quantity:</label>
                  <input type="number" value={form.affected_quantity} onChange={(e) => handleChange('affected_quantity', e.target.value)} className="input-field" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Others, Pls. Specify:</label>
                  <input type="text" value={form.others} onChange={(e) => handleChange('others', e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-field" style={{ margin: 0, textAlign: 'center' }}>DETAILS OF NON-CONFORMANCE</label>
              <textarea
                value={form.details_of_nonconformance}
                onChange={(e) => handleChange('details_of_nonconformance', e.target.value)}
                className="input-field"
                placeholder="Detailed description..."
                required
                style={{ width: '100%', height: '120px', padding: '10px', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Request Date:</label>
                <input
                  type="date"
                  value={form.request_date}
                  onChange={(e) => handleChange('request_date', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

          </form>
          )}
        </div>

        <div 
          className="modal-footer-actions"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 0 0 0',
            background: 'transparent',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            marginTop: '12px'
          }}
        >
          {isLinkingMode ? (
            <button type="button" className="btn-gradient-primary" onClick={() => setIsLinkingMode(false)} style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}>
              Done
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary-light" onClick={onClose} disabled={isSubmitting} style={{ margin: 0, padding: '8px 20px', fontSize: '13px' }}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-gradient-primary" 
                disabled={isSubmitting}
                onClick={onSubmit}
                style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}
              >
                {isSubmitting ? 'Submitting…' : 'Submit CAR'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default CARModal
