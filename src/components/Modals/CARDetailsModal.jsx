import { createPortal } from 'react-dom'
import { X as CloseIcon, Clipboard, CheckCircle, AlertTriangle, User, Calendar, Sparkles } from 'lucide-react'
import { isAdminRole } from '@/utils/roleUtils.js'

export default function CARDetailsModal({
  isOpen,
  onClose,
  car,
  userRole,
  userPermissions,
  userDepartmentName,
  userDepartmentId,
  readOnly = false,

  // States
  rootCause,
  setRootCause,
  rcaMethod = '5whys',
  setRcaMethod,
  fiveWhys = {},
  handleFiveWhyChange,
  fishbone = {},
  handleFishboneChange,
  rootCauseSummary = '',
  handleRootCauseSummaryChange,
  correctiveAction,
  setCorrectiveAction,
  preventiveAction,
  setPreventiveAction,
  targetVerificationDate,
  setTargetVerificationDate,
  verificationNotes,
  setVerificationNotes,
  verificationRating,
  setVerificationRating,
  submitting,
  suggesting,
  suggestionMeta,
  error,
  linkedClauses = [],
  loadingClauses = false,

  // Handlers
  handleSuggestActions,
  handleCapaSubmit,
  handleVerificationSubmit
}) {
  if (!isOpen || !car) return null

  const normalize = (value) => String(value || '').trim().toLowerCase()
  const resolvedUserDepartmentName = normalize(userDepartmentName || userDepartmentId)
  const carDepartmentName = normalize(car.responsible_department || car.requesting_department)
  const hasExplicitRights = Array.isArray(userPermissions?.rights)
  const rights = hasExplicitRights ? userPermissions.rights : []
  const normalizedRole = normalize(userRole)
  const canSubmitCapa = isAdminRole(userRole) || (hasExplicitRights ? rights.includes('submit_capa') : true)
  const isWarehouseVerifier = isAdminRole(userRole) ||
    ['qa officer', 'auditor', 'quality assurance'].includes(normalizedRole) ||
    (hasExplicitRights
      ? rights.includes('verify_car')
      : (normalizedRole === 'warehouse staff' && Boolean(resolvedUserDepartmentName) && resolvedUserDepartmentName === carDepartmentName))

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
          <h3 className="reports-update-title" style={{ margin: 0 }}>
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
            <div><span style={{ color: 'var(--muted)' }}>Requesting Dept:</span> <strong style={{ color: '#1A435A' }}>{car.requesting_department || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Responsible Dept:</span> <strong style={{ color: '#1A435A' }}>{car.responsible_department || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Requestor:</span> <strong style={{ color: '#1A435A' }}>{car.requestor || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Recipient:</span> <strong style={{ color: '#1A435A' }}>{car.recipient || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Type of Non-Conformance:</span> <strong style={{ color: '#1A435A' }}>{car.type_of_nonconformance || car.others || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Date Issued:</span> <strong style={{ color: '#1A435A' }}>{car.date ? new Date(car.date).toLocaleDateString() : '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Product / Material:</span> <strong style={{ color: '#1A435A' }}>{car.product_material_name || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Model / Type:</span> <strong style={{ color: '#1A435A' }}>{car.model_type || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Control No.:</span> <strong style={{ color: '#1A435A' }}>{car.control_no || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Affected Qty:</span> <strong style={{ color: '#1A435A' }}>{car.affected_quantity ?? '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Request Date:</span> <strong style={{ color: '#1A435A' }}>{car.request_date ? new Date(car.request_date).toLocaleDateString() : '—'}</strong></div>
            {(car.no_reply || car.re_corrective_action || car.reason_reissue) && (
              <div>
                <span style={{ color: 'var(--muted)' }}>Reason for Re-issue:</span>{' '}
                <strong style={{ color: '#1A435A' }}>
                  {[
                    car.no_reply ? 'No Reply' : null,
                    car.re_corrective_action ? 'Re-Corrective Action' : null,
                    car.reason_reissue || null
                  ].filter(Boolean).join(', ')}
                </strong>
              </div>
            )}
            {car.others && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--muted)' }}>Others / Remarks:</span> <strong style={{ color: '#1A435A' }}>{car.others}</strong>
              </div>
            )}
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
              color: '#1A435A',
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
              color: '#1A435A',
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

          {/* Previous VoE Rejection Banner when Re-Opened */}
          {car.status === 'open' && car.verification_notes && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#991b1b',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} /> Re-opened from Verification (Ineffective)
              </strong>
              <div>"{car.verification_notes}"</div>
            </div>
          )}

          {/* CAPA SECTION */}
          {car.status === 'open' && !readOnly ? (
            canSubmitCapa ? (
              <form onSubmit={handleCapaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ color: '#0891b2', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} /> Implement CAPA Action Plan
                  </h4>
                </div>

                {/* STEP 1: ROOT CAUSE ANALYSIS (5 WHYS / FISHBONE / BOTH) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <label className="label-field" style={{ marginBottom: '2px', display: 'block', color: '#1A435A', fontWeight: 600 }}>
                        1. Root Cause Analysis (RCA)
                      </label>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Investigate the root cause using 5 Whys, Fishbone (6M), or Both. Your RCA will serve as the basis for CBR action suggestions.
                      </span>
                    </div>

                    {setRcaMethod && (
                      <div style={{
                        display: 'inline-flex',
                        background: '#e2e8f0',
                        padding: '3px',
                        borderRadius: '6px',
                        gap: '2px'
                      }}>
                        {[
                          { id: '5whys', label: '5 Whys' },
                          { id: 'fishbone', label: 'Fishbone (6M)' },
                          { id: 'both', label: 'Both' }
                        ].map((tab) => {
                          const active = rcaMethod === tab.id
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setRcaMethod(tab.id)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: active ? 600 : 500,
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                background: active ? '#ffffff' : 'transparent',
                                color: active ? '#0891b2' : '#475569',
                                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                              }}
                            >
                              {tab.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Fishbone (6M) Diagram Inputs */}
                  {(rcaMethod === 'fishbone' || rcaMethod === 'both') && handleFishboneChange && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Fishbone (6M) Contributing Factors
                      </span>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '8px'
                      }}>
                        {[
                          { key: 'man', label: 'Man (People)', placeholder: 'e.g. Training gap, operator handling...' },
                          { key: 'machine', label: 'Machine (Equipment)', placeholder: 'e.g. Equipment setting, tool wear...' },
                          { key: 'material', label: 'Material', placeholder: 'e.g. Raw material defect, packaging...' },
                          { key: 'method', label: 'Method (Process)', placeholder: 'e.g. Unclear SOP, skipped check...' },
                          { key: 'measurement', label: 'Measurement', placeholder: 'e.g. Calibration, inspection error...' },
                          { key: 'environment', label: 'Environment', placeholder: 'e.g. Temperature, humidity, storage...' }
                        ].map((bone) => (
                          <div key={bone.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                              {bone.label}
                            </label>
                            <input
                              type="text"
                              value={fishbone[bone.key] || ''}
                              onChange={(e) => handleFishboneChange(bone.key, e.target.value)}
                              placeholder={bone.placeholder}
                              className="input-field"
                              style={{ padding: '6px 8px', fontSize: '12px', background: '#ffffff' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5 Whys Method Inputs */}
                  {(rcaMethod === '5whys' || rcaMethod === 'both') && handleFiveWhyChange && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        5 Whys Cause Chain
                      </span>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            minWidth: '54px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0891b2',
                            background: 'rgba(8, 145, 178, 0.1)',
                            border: '1px solid rgba(8, 145, 178, 0.25)',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            textAlign: 'center'
                          }}>
                            Why {num}?
                          </span>
                          <input
                            type="text"
                            value={fiveWhys[`why${num}`] || ''}
                            onChange={(e) => handleFiveWhyChange(`why${num}`, e.target.value)}
                            placeholder={
                              num === 1
                                ? 'Why did the non-conformance occur?'
                                : `Why did Why ${num - 1} happen?${num >= 4 ? ' (Optional if root cause already reached)' : ''}`
                            }
                            className="input-field"
                            style={{ flex: 1, padding: '6px 8px', fontSize: '12px', background: '#ffffff' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Concluding Root Cause Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="label-field" style={{ fontSize: '12px' }}>
                      Concluding Root Cause Statement:
                    </label>
                    <textarea
                      value={handleRootCauseSummaryChange ? rootCauseSummary : rootCause}
                      onChange={(e) =>
                        handleRootCauseSummaryChange
                          ? handleRootCauseSummaryChange(e.target.value)
                          : setRootCause(e.target.value)
                      }
                      className="input-field"
                      placeholder="Summarize the primary root cause identified from your 5 Whys / Fishbone analysis..."
                      style={{ height: '64px', padding: '8px', fontSize: '13px', resize: 'none', background: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* STEP 2: CBR SUGGESTED CORRECTIVE & PREVENTIVE ACTIONS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A435A' }}>
                      2. Corrective & Preventive Actions
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                      Uses Non-Conformance Details + your Root Cause Analysis above to retrieve matching past cases.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSuggestActions}
                    disabled={suggesting}
                    className="btn-quick-toggle"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: 'rgba(8, 145, 178, 0.12)',
                      border: '1px solid rgba(8, 145, 178, 0.3)',
                      color: '#0891b2',
                      borderRadius: '4px',
                      cursor: suggesting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Sparkles size={13} /> {suggesting ? 'Matching RCA & Cases...' : 'Suggest Actions from RCA (CBR)'}
                  </button>
                </div>

                {suggestionMeta && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                      background: 'rgba(59,130,246,0.1)', color: '#2563eb',
                      border: '1px solid rgba(59,130,246,0.2)'
                    }}>
                      Source: {suggestionMeta.sourceDetails}
                    </span>
                    {suggestionMeta.matchedFeatures?.length > 0 && (
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                        background: 'rgba(16,185,129,0.1)', color: '#059669',
                        border: '1px solid rgba(16,185,129,0.2)'
                      }}>
                        ✓ {suggestionMeta.matchedFeatures.join(' · ')}
                      </span>
                    )}
                    {suggestionMeta.confidence > 0 && (
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                        background: 'rgba(16,185,129,0.1)', color: '#059669',
                        border: '1px solid rgba(16,185,129,0.2)'
                      }}>
                        {Math.round(suggestionMeta.confidence * 100)}% match
                      </span>
                    )}
                  </div>
                )}

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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">Target Verification Date (VoE Date)</label>
                  <input
                    type="date"
                    value={targetVerificationDate}
                    onChange={(e) => setTargetVerificationDate(e.target.value)}
                    className="input-field"
                    required
                    style={{ padding: '8px', fontSize: '13px' }}
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
                    <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#1A435A', whiteSpace: 'pre-line' }}>
                      {car.root_cause_analysis}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Immediate Corrective Action</span>
                    <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#1A435A' }}>
                      {car.corrective_action}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Preventive Action</span>
                    <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#1A435A' }}>
                      {car.preventive_action}
                    </div>
                  </div>

                  {car.target_verification_date && (
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      <span style={{ color: 'var(--muted)' }}>Target Verification Date:</span>{' '}
                      <strong style={{ color: '#1A435A' }}>{new Date(car.target_verification_date).toLocaleDateString()}</strong>
                    </div>
                  )}
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
            isWarehouseVerifier ? (
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

                <div className="preventive-panel">
                  <span className="label-field label-field--small">Effectiveness Rating:</span>
                  <div className="preventive-options">
                    {['Excellent', 'Good', 'Ok', 'Poor', 'Very Poor'].map((rating) => (
                      <label key={rating} className="preventive-option">
                        <input
                          type="radio"
                          name="verificationRating"
                          value={rating}
                          checked={verificationRating === rating}
                          onChange={(e) => setVerificationRating(e.target.value)}
                          className="radio-accent"
                        />
                        {rating}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  {car.target_verification_date && new Date().setHours(0,0,0,0) < new Date(car.target_verification_date).setHours(0,0,0,0) ? (
                    <div style={{ color: '#ef4444', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                      Verification locked until {new Date(car.target_verification_date).toLocaleDateString()}
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', marginTop: '16px' }}>
                Under verification. Waiting for warehouse staff in the responsible department to review the action plan.
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
                {car.verification_rating && (
                  <div style={{ color: '#0f5132', fontWeight: 600 }}>
                    Effectiveness Rating: {car.verification_rating}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '8px', fontSize: '11px', color: '#0f5132' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    Verified On: {new Date(car.verification_date).toLocaleDateString()}
                  </span>
                  {(car.verified_by_name || car.verified_by) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} />
                      Verified By: {car.verified_by_name || `${car.verified_by.slice(0, 8)}...`}
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
