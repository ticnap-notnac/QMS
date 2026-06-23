import { createPortal } from 'react-dom'
import { X as CloseIcon, Clipboard, CheckCircle, AlertTriangle, User, Calendar, Sparkles } from 'lucide-react'

export default function CARDetailsModal({
  isOpen,
  onClose,
  car,
  userRole,
  readOnly = false,

  // States
  rootCause,
  setRootCause,
  correctiveAction,
  setCorrectiveAction,
  preventiveAction,
  setPreventiveAction,
  verificationNotes,
  setVerificationNotes,
  submitting,
  suggesting,
  error,
  linkedClauses = [],
  loadingClauses = false,

  // Handlers
  handleSuggestActions,
  handleCapaSubmit,
  handleVerificationSubmit
}) {
  if (!isOpen || !car) return null

  const isUserRecipient = true // Allow processing. In production, can check if current user matches car.recipient.
  const isAuditorOrAdmin = userRole === 'admin' || userRole === 'auditor'

  const getStatusBadgeClass = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'closed') return 'is-closed'
    if (s === 'under_verification') return 'is-active'
    return 'is-open'
  }

  const getStatusLabel = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'closed') return 'Closed'
    if (s === 'under_verification') return 'Under Verification'
    return 'Open'
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '92vh',
          width: '780px',
          maxWidth: '95vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative' // Anchors absolute child tags securely
        }}
      >
        {/* ✕ ABSOLUTE CLOSE ICON WITH RESOLVED POSITION TARGETS */}
        <button 
          type="button" 
          onClick={onClose} 
          className="modal-close-button" 
          style={{ 
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 15,
            background: 'none',
            border: 'none',
            color: 'var(--muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <CloseIcon size={18} />
        </button>

        {/* HEADER BLOCK — SHIFTED AWAY FROM ACTION ZONE COLLISION */}
        <div 
          className="modal-header-row" 
          style={{ 
            flexShrink: 0, 
            marginBottom: '16px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingLeft: '28px',
            paddingRight: '48px', // 🎯 THE FIX: Keeps elements left of the '✕' close handle area
            paddingTop: '24px'
          }}
        >
          <h3 className="reports-update-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Clipboard size={20} className="icon-cyan" />
            CAR Details - {car.reference_no}
          </h3>
          <span className={`iso-status-pill ${getStatusBadgeClass(car.status)}`} style={{ margin: 0, whiteSpace: 'nowrap' }}>
            {getStatusLabel(car.status)}
          </span>
        </div>

        {error && <div className="user-info-error" style={{ marginBottom: '12px', flexShrink: 0 }}>{error}</div>}

        {/* Scrollable Form Content */}
        <div className="modal-form-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Metadata Grid */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '13px'
          }}>
            <div><span style={{ color: 'var(--muted)' }}>Requesting Dept:</span> <strong style={{ color: '#0f172a' }}>{car.requesting_department || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Responsible Dept:</span> <strong style={{ color: '#0f172a' }}>{car.responsible_department || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Requestor:</span> <strong style={{ color: '#0f172a' }}>{car.requestor || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Recipient:</span> <strong style={{ color: '#0f172a' }}>{car.recipient || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Product / Material:</span> <strong style={{ color: '#0f172a' }}>{car.product_material_name || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Model / Type:</span> <strong style={{ color: '#0f172a' }}>{car.model_type || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Control No.:</span> <strong style={{ color: '#0f172a' }}>{car.control_no || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Affected Qty:</span> <strong style={{ color: '#0f172a' }}>{car.affected_quantity || '—'}</strong></div>
            <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--muted)' }}>Request Date:</span> <strong style={{ color: '#0f172a' }}>{car.request_date ? new Date(car.request_date).toLocaleDateString() : '—'}</strong></div>
          </div>

          {/* Details of Nonconformance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-field" style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Details of Non-Conformance</label>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0f172a',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>{car.details_of_nonconformance}</div>
          </div>

          {/* Linked ISO Clauses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-field" style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Linked ISO Clauses</label>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0f172a',
              lineHeight: '1.5'
            }}>
              {loadingClauses ? (
                <span style={{ color: '#64748b' }}>Loading linked clauses...</span>
              ) : linkedClauses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {linkedClauses.map((cl, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#0891b2', fontWeight: 'bold' }}>Clause {cl.clause_number}</span>
                      <span>—</span>
                      <span style={{ color: '#334155' }}>{cl.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: '#64748b' }}>No linked ISO clauses.</span>
              )}
            </div>
          </div>

          {/* CAPA SECTION */}
          {car.status === 'open' && !readOnly ? (
            isUserRecipient ? (
              <form onSubmit={handleCapaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0' }}>
                  <h4 style={{ color: '#0891b2', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} /> Implement CAPA Action Plan
                  </h4>
                  <button
                    type="button"
                    onClick={handleSuggestActions}
                    disabled={suggesting}
                    className="btn-quick-toggle"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      background: 'rgba(8, 145, 178, 0.12)',
                      border: '1px solid rgba(8, 145, 178, 0.3)',
                      color: '#0891b2',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={13} /> {suggesting ? 'Analyzing...' : 'Suggest Actions (CBR)'}
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">Root Cause Analysis (RCA)</label>
                  <textarea
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    className="input-field"
                    placeholder="Analyze why the non-conformance occurred..."
                    required
                    style={{ height: '80px', padding: '8px', fontSize: '13px', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">Immediate Corrective Action (Correction)</label>
                  <textarea
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    className="input-field"
                    placeholder="Enter immediate corrective actions taken..."
                    required
                    style={{ height: '80px', padding: '8px', fontSize: '13px', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">Preventive Action Plan</label>
                  <textarea
                    value={preventiveAction}
                    onChange={(e) => setPreventiveAction(e.target.value)}
                    className="input-field"
                    placeholder="Enter long-term actions to prevent re-occurrence..."
                    required
                    style={{ height: '80px', padding: '8px', fontSize: '13px', resize: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gradient-primary"
                  style={{ alignSelf: 'flex-end', margin: '8px 0 0 0', padding: '8px 24px', height: 'auto', fontSize: '13px' }}
                >
                  {submitting ? 'Submitting...' : 'Submit CAPA Action Plan'}
                </button>
              </form>
            ) : (
              <div className="empty-state" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px' }}>
                Waiting for the recipient to submit a CAPA action plan.
              </div>
            )
          ) : (
            (car.root_cause_analysis || car.corrective_action || car.preventive_action) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <h4 style={{ color: '#10b981', fontSize: '14px', margin: 0 }}>Corrective & Preventive Actions (CAPA)</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Root Cause Analysis</span>
                    <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#0f172a' }}>
                      {car.root_cause_analysis}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Immediate Corrective Action</span>
                    <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#0f172a' }}>
                      {car.corrective_action}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Preventive Action</span>
                    <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#0f172a' }}>
                      {car.preventive_action}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              readOnly && (
                <div className="empty-state" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', marginTop: '16px' }}>
                  No CAPA plan has been submitted yet.
                </div>
              )
            )
          )}

          {/* VERIFICATION OF EFFECTIVENESS (VoE) SECTION */}
          {car.status === 'under_verification' && !readOnly ? (
            isAuditorOrAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <h4 style={{ color: '#f59e0b', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> Verification of Effectiveness (VoE)
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">Verification Evidence & Notes</label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="input-field"
                    placeholder="Enter audit check evidence, checks run, and whether the issue is fully resolved..."
                    required
                    style={{ height: '90px', padding: '8px', fontSize: '13px', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleVerificationSubmit('ineffective')}
                    className="btn-secondary-light"
                    style={{ margin: 0, borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '8px 20px', height: 'auto', fontSize: '13px' }}
                  >
                    Mark Ineffective (Re-open)
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleVerificationSubmit('effective')}
                    className="btn-gradient-primary"
                    style={{ margin: 0, padding: '8px 24px', height: 'auto', fontSize: '13px' }}
                  >
                    {submitting ? 'Verifying...' : 'Mark Effective (Close)'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', marginTop: '16px' }}>
                Under verification. Waiting for an auditor or quality admin to review the action plan.
              </div>
            )
          ) : (
            car.verification_notes ? null : (
              readOnly && car.status === 'under_verification' && (
                <div className="empty-state" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', marginTop: '16px' }}>
                  Under verification. Action plan submitted, pending review.
                </div>
              )
            )
          )}

          {/* Read-Only VoE summary if closed */}
          {car.status === 'closed' && car.verification_notes && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              borderTop: '1px solid #cbd5e1',
              paddingTop: '16px'
            }}>
              <h4 style={{ color: '#10b981', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Verification of Effectiveness (VoE) Details
              </h4>
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
                color: '#0f5132',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontStyle: 'italic', color: '#0f5132' }}>"{car.verification_notes}"</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '8px', fontSize: '11px', color: '#0f5132' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    Verified On: {new Date(car.verification_date).toLocaleDateString()}
                  </span>
                  {car.verified_by && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} />
                      Verified By: {car.verified_by.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div
          className="modal-footer-actions"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '18px 28px',
            borderTop: '1px solid #cbd5e1',
            boxSizing: 'border-box'
          }}
        >
          <button type="button" className="btn-secondary-light" onClick={onClose} style={{ margin: 0, padding: '8px 24px', fontSize: '13px' }}>
            Close Detail
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}