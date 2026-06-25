import { useState } from 'react'
import { X as CloseIcon, Link, LoaderCircle, CheckCircle2, XCircle } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'

function CARModal({
  isOpen,
  onClose,
  form,
  handleChange,
  toggleNcrSelection,
  toggleClauseSelection,
  fetchClauseSuggestions,
  clausesLoading,
  clausesError,
  userAuthId,
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
          overflow: 'hidden',
          position: 'relative' // Keeps close button tracking stable
        }}
      >
        {/* ── ✕ ABSOLUTE CLOSE HANDLE WITH PROPER CORNER CLEARANCE BOUNDS ── */}
        <button 
          type="button" 
          onClick={onClose} 
          className="modal-close-button" 
          style={{ 
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            background: 'none',
            border: 'none',
            color: 'var(--muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <CloseIcon size={18} />
        </button>

        {/* ── 📋 HEADER ROW FLOW FRAME — CLEARED FROM CROSS OVERLAPPING CRITERIA ── */}
        <div 
          className="modal-header-row" 
          style={{ 
            flexShrink: 0, 
            marginBottom: '16px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingLeft: '28px',
            paddingRight: '48px',
            paddingTop: '24px'
          }}
        >
          <h3 className="reports-update-title" style={{ margin: 0 }}>
            {isLinkingMode ? 'Select NCRs to Link' : 'Corrective Action Request (CAR)'}
          </h3>
          
          {!isLinkingMode && (
            <button 
              type="button" 
              className="btn-secondary-light" 
              onClick={() => setIsLinkingMode(true)}
              style={{ margin: 0, whiteSpace: 'nowrap' }}
            >
              {form.ncr_ids?.length > 0 ? `Linked NCRs: ${form.ncr_ids.length} (Change)` : 'Link NCR'}
            </button>
          )}
        </div>

        {error && !isLinkingMode && <div className="user-info-error" style={{ marginBottom: '12px', flexShrink: 0, marginLeft: '28px', marginRight: '28px' }}>{error}</div>}

        <div className="modal-form-content" style={{ flex: 1, overflowY: 'auto', paddingLeft: '28px', paddingRight: '28px', paddingBottom: '24px' }}>
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
                          background: isSelected ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc',
                          border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #e2e8f0',
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
                          onChange={() => toggleNcrSelection(report.id, report.reference_no || String(report.id), report)}
                          style={{ marginTop: '4px' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#0f172a', fontWeight: '500' }}>{report.reference_no || `NCR #${report.id}`}</span>
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
                    max="9999-12-31"
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.no_reply}
                    onChange={(e) => handleChange('no_reply', e.target.checked)}
                  /> No Reply
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.re_corrective_action}
                    onChange={(e) => handleChange('re_corrective_action', e.target.checked)}
                  /> Re-Corrective Action
                </label>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              <h4 style={{ color: '#0f172a', fontSize: '14px', margin: '0 0 8px 0', textAlign: 'center' }}>TYPE OF NON-CONFORMANCE</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {checkboxFields.map(field => (
                    <label key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
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
                    <input 
                      type="number" 
                      min="0"
                      value={form.affected_quantity} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || Number(val) >= 0) {
                          handleChange('affected_quantity', val);
                        }
                      }} 
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e') {
                          e.preventDefault();
                        }
                      }}
                      className="input-field" 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="label-field">Others, Pls. Specify:</label>
                    <input type="text" value={form.others} onChange={(e) => handleChange('others', e.target.value)} className="input-field" />
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="label-field" style={{ margin: 0, textAlign: 'center' }}>DETAILS OF NON-CONFORMANCE</label>
                <textarea
                  value={form.details_of_nonconformance}
                  onChange={(e) => handleChange('details_of_nonconformance', e.target.value)}
                  className="input-field"
                  placeholder="Detailed description..."
                  style={{ width: '100%', height: '120px', padding: '10px', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* ── ISO Clause Linkage Panel ─────────────────────────────── */}
              <div style={{
                background: 'rgba(8, 145, 178, 0.04)',
                border: '1px solid rgba(8, 145, 178, 0.15)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0891b2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link size={14} /> ISO Clause Linkage
                  </span>
                  <button
                    type="button"
                    className="btn-secondary-light"
                    disabled={clausesLoading || !form.details_of_nonconformance?.trim()}
                    onClick={() => fetchClauseSuggestions(userAuthId)}
                    style={{ margin: 0, padding: '5px 12px', fontSize: '12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {clausesLoading ? (
                      <><LoaderCircle size={12} className="iso-spinner" /> Analyzing...</>
                    ) : (
                      <><Link size={12} /> Suggest Matching Clauses</>
                    )}
                  </button>
                </div>

                {clausesError && (
                  <div style={{ fontSize: '12px', color: '#f87171', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '4px' }}>
                    {clausesError}
                  </div>
                )}

                {form.linked_clause_ids?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {form.suggested_clauses
                      ?.filter(s => form.linked_clause_ids.includes(s.clause_id))
                      .map(s => (
                        <span
                          key={s.clause_id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(8, 145, 178, 0.12)', border: '1px solid rgba(8, 145, 178, 0.3)',
                            borderRadius: '4px', padding: '3px 8px', fontSize: '12px', color: '#0891b2'
                          }}
                        >
                          <CheckCircle2 size={11} /> Clause {s.clause_number} – {s.title}
                          <button
                            type="button"
                            onClick={() => toggleClauseSelection(s.clause_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 0 0 4px', lineHeight: 1 }}
                          >
                            <XCircle size={12} />
                          </button>
                        </span>
                      ))
                    }
                  </div>
                )}

                {form.suggested_clauses?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Suggested Clauses — click to confirm
                    </span>
                    {form.suggested_clauses.map(suggestion => {
                      const isConfirmed = form.linked_clause_ids?.includes(suggestion.clause_id)
                      const confPct = Math.round((suggestion.confidence || 0) * 100)
                      const confColor = confPct >= 70 ? '#10b981' : confPct >= 40 ? '#f59e0b' : '#94a3b8'
                      return (
                        <button
                          key={suggestion.clause_id}
                          type="button"
                          onClick={() => toggleClauseSelection(suggestion.clause_id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '12px', padding: '9px 12px', borderRadius: '6px', cursor: 'pointer',
                            background: isConfirmed ? 'rgba(8, 145, 178, 0.08)' : '#f8fafc',
                            border: isConfirmed ? '1px solid rgba(8, 145, 178, 0.35)' : '1px solid #e2e8f0',
                            textAlign: 'left', transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: isConfirmed ? '600' : '400' }}>
                              <span style={{ color: '#0891b2', fontWeight: 'bold', marginRight: '6px' }}>Clause {suggestion.clause_number}</span>
                              {suggestion.title}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }}>
                                <div style={{ width: `${confPct}%`, height: '100%', background: confColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
                              </div>
                              <span style={{ fontSize: '10px', color: confColor, fontWeight: 'bold', minWidth: '32px' }}>{confPct}%</span>
                            </div>
                          </div>
                          <div style={{ color: isConfirmed ? '#0891b2' : '#475569', flexShrink: 0 }}>
                            {isConfirmed ? <CheckCircle2 size={16} /> : <span style={{ fontSize: '11px', color: '#475569' }}>+ Add</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {!clausesLoading && !form.suggested_clauses?.length && !clausesError && (
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                    Fill in the non-conformance details above, then click "Suggest Matching Clauses" to automatically identify the relevant ISO clauses for this CAR.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '31.5%' }}>
                  <label className="label-field">Request Date:</label>
                  <input
                    type="date"
                    value={form.request_date}
                    onChange={(e) => handleChange('request_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max="9999-12-31"
                    className="input-field"
                  />
                </div>
              </div>

            </form>
          )}
        </div>

        {/* ── MODAL FOOTER ACTION BAR ── */}
        <div 
          className="modal-footer-actions"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            padding: '18px 28px 24px 28px',
            background: 'transparent',
            borderTop: '1px solid #cbd5e1',
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
                {isSubmitting ? 'Submitting…' : (form.id ? 'Update CAR' : 'Submit CAR')}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default CARModal