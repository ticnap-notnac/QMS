import { useState, useEffect } from 'react'
import { X as CloseIcon, Clipboard, CheckCircle, User, Calendar, Sparkles } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'
import { generateAiSuggestionFromText } from '../../services/suggestionService'

export default function QDDRDetailsModal({
  isOpen,
  onClose,
  qddr,
  onUpdateQddr,
  users,
  usersLoading,
  userRole,
  authUserId,
  readOnly = false
}) {
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [preventiveAction, setPreventiveAction] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [notedBy, setNotedBy] = useState('')
  const [leader, setLeader] = useState('')
  const [status, setStatus] = useState('open')
  const [submitting, setSubmitting] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [error, setError] = useState('')

  // Sync state with selected QDDR details
  useEffect(() => {
    if (qddr) {
      setCorrectiveAction(qddr.corrective_action || '')
      setPreventiveAction(qddr.preventive_action || '')
      
      // Resolve signatures to their names if populated
      const resolveName = (userId) => {
        if (!userId) return ''
        const found = users?.find(u => String(u.id) === String(userId))
        return found ? found.label : ''
      }
      
      setApprovedBy(resolveName(qddr.approved_by))
      setNotedBy(resolveName(qddr.noted_by))
      setLeader(resolveName(qddr.leader))
      setStatus(qddr.status || 'open')
      setSuggestionMeta(null)
      setError('')
    }
  }, [qddr, users])

  if (!isOpen || !qddr) return null

  const handleSuggestActions = async () => {
    setSuggesting(true)
    setError('')
    setSuggestionMeta(null)
    try {
      const res = await generateAiSuggestionFromText({
        description: qddr.reason_of_discrepancy,
        issueType: 'quality',
        deptName: qddr.location
      })
      if (res?.suggestion) {
        setCorrectiveAction(res.suggestion)
      }
      if (res?.preventive_suggestion) {
        setPreventiveAction(res.preventive_suggestion)
      }
      if (res?.sourceDetails) {
        setSuggestionMeta({
          sourceDetails: res.sourceDetails,
          matchedFeatures: res.matchedFeatures || [],
          confidence: res.confidence || 0
        })
      }
    } catch (err) {
      console.error('Failed to get suggestions:', err)
      setError('We could not generate suggestions. Please try again later.')
    } finally {
      setSuggesting(false)
    }
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onUpdateQddr(qddr.id, {
        corrective_action: correctiveAction,
        preventive_action: preventiveAction,
        approved_by: approvedBy,
        noted_by: notedBy,
        leader: leader,
        status: status
      }, authUserId)
      onClose()
    } catch (err) {
      setError('The QDDR report could not be updated. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadgeClass = (s) => {
    const statusVal = String(s || '').toLowerCase()
    if (statusVal === 'closed') return 'is-closed'
    return 'is-open'
  }

  const getStatusLabel = (s) => {
    const statusVal = String(s || '').toLowerCase()
    if (statusVal === 'closed') return 'Closed'
    return 'Open'
  }

  const checkboxFields = [
    { key: 'holes_punctures', label: 'Holes & Punctures' },
    { key: 'deformed_torn', label: 'Deformed or Torn' },
    { key: 'open_carton', label: 'Open Carton' },
    { key: 'crushed_dented', label: 'Crushed or Dented' },
    { key: 'wet_leaked', label: 'Wet or Leaked' },
    { key: 'stain_graffiti', label: 'Stain or Graffiti' },
    { key: 'bulging', label: 'Bulging' },
    { key: 'improper_stretch_wrapping', label: 'Improper Stretch Wrapping' },
    { key: 'wrong_no_batchcode', label: 'Wrong/No Batchcode' },
    { key: 'opened_seal', label: 'Opened Seal' },
    { key: 'no_label_broken_label', label: 'No Label/Broken Label' },
    { key: 'short_pack', label: 'Short Pack' },
    { key: 'excess_shipment', label: 'Excess Shipment' },
    { key: 'documentation_error', label: 'Documentation Error' },
    { key: 'picking_discrepancy', label: 'Picking Discrepancy' }
  ]

  const activeDiscrepancies = checkboxFields.filter(f => qddr[f.key])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '92vh',
          width: '850px',
          maxWidth: '95vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative' // Holds tracking alignments stable
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
            paddingRight: '48px', // 🎯 THE FIX: Keeps status pill elements left of the '✕' exit trigger
            paddingTop: '24px'
          }}
        >
          <h3 className="reports-update-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Clipboard size={20} className="icon-cyan" />
            QDDR Details - {qddr.reference_no}
          </h3>
          <span className={`iso-status-pill ${getStatusBadgeClass(qddr.status)}`} style={{ margin: 0, whiteSpace: 'nowrap' }}>
            {getStatusLabel(qddr.status)}
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
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            fontSize: '13px'
          }}>
            <div><span style={{ color: 'var(--muted)' }}>Location:</span> <strong style={{ color: '#0f172a' }}>{qddr.location || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Date:</span> <strong style={{ color: '#0f172a' }}>{qddr.date ? new Date(qddr.date).toLocaleDateString() : '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Time:</span> <strong style={{ color: '#0f172a' }}>{qddr.time || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>Trucker / Broker:</span> <strong style={{ color: '#0f172a' }}>{qddr.trucker_broker || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Plate Number:</span> <strong style={{ color: '#0f172a' }}>{qddr.plate_number || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Container Number:</span> <strong style={{ color: '#0f172a' }}>{qddr.container_number || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>PO Reference:</span> <strong style={{ color: '#0f172a' }}>{qddr.po_reference || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>DR / WB Number:</span> <strong style={{ color: '#0f172a' }}>{qddr.drwb_number || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Brand / Supplier:</span> <strong style={{ color: '#0f172a' }}>{qddr.brand_supplier || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>Material:</span> <strong style={{ color: '#0f172a' }}>{qddr.material_description || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Material Code:</span> <strong style={{ color: '#0f172a' }}>{qddr.material_code || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Batch / ISU No:</span> <strong style={{ color: '#0f172a' }}>{qddr.batch_code_su_number || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>Quantity:</span> <strong style={{ color: '#0f172a' }}>{qddr.qty || '—'}</strong></div>
            {qddr.ncr_id && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--muted)' }}>Linked NCR:</span> <strong style={{ color: '#0f172a' }}>{qddr.ncr_id}</strong>
              </div>
            )}
          </div>

          {/* Discrepancies Checked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-field" style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Types of Discrepancy Checked</label>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px',
              borderRadius: '6px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {activeDiscrepancies.length > 0 ? (
                activeDiscrepancies.map(f => (
                  <span key={f.key} style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#dc2626',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {f.label}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '13px' }}>None checked</span>
              )}
              {qddr.others && (
                <span style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '4px 10px',
                  borderRadius: '100px',
                  fontSize: '11px'
                }}>
                  Other: {qddr.others}
                </span>
              )}
            </div>
          </div>

          {/* Reason of Discrepancy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-field" style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>Reason of Discrepancy</label>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0f172a',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>{qddr.reason_of_discrepancy}</div>
          </div>

          {/* RESOLUTION SECTION */}
          {!readOnly ? (
            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0' }}>
                <h4 style={{ color: '#0891b2', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> Resolve / Close Discrepancy Report
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

              {suggestionMeta && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">Corrective Action</label>
                  <textarea
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    className="input-field"
                    placeholder="Enter corrective actions taken..."
                    style={{ height: '80px', padding: '8px', fontSize: '13px', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">Preventive Action</label>
                  <textarea
                    value={preventiveAction}
                    onChange={(e) => setPreventiveAction(e.target.value)}
                    className="input-field"
                    placeholder="Enter preventive actions to implement..."
                    style={{ height: '80px', padding: '8px', fontSize: '13px', resize: 'none' }}
                  />
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <SearchableDropdown
                    label="Leader / Supervisor:"
                    value={leader}
                    onValueChange={setLeader}
                    options={users}
                    loading={usersLoading}
                    placeholder="Search leader..."
                    onSelectOption={(opt) => setLeader(opt.label)}
                  />
                </div>
                <div>
                  <SearchableDropdown
                    label="Approved By:"
                    value={approvedBy}
                    onValueChange={setApprovedBy}
                    options={users}
                    loading={usersLoading}
                    placeholder="Search approver..."
                    onSelectOption={(opt) => setApprovedBy(opt.label)}
                  />
                </div>
                <div>
                  <SearchableDropdown
                    label="Noted By:"
                    value={notedBy}
                    onValueChange={setNotedBy}
                    options={users}
                    loading={usersLoading}
                    placeholder="Search user..."
                    onSelectOption={(opt) => setNotedBy(opt.label)}
                  />
                </div>
              </div>

              {/* Status & Submit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="label-field" style={{ margin: 0 }}>Status:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="input-field"
                    style={{ padding: '6px 12px', fontSize: '13px', width: '120px' }}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn-gradient-primary"
                  disabled={submitting}
                  style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ color: '#0f172a', fontSize: '14px', margin: '0' }}>Resolution Details</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Corrective Action:</span>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#0f172a',
                    marginTop: '4px'
                  }}>{qddr.corrective_action || '—'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Preventive Action:</span>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#0f172a',
                    marginTop: '4px'
                  }}>{qddr.preventive_action || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '13px', borderTop: '1px solid #cbd5e1', paddingTop: '12px' }}>
                <div><span style={{ color: 'var(--muted)' }}>Leader / Supervisor:</span> <strong style={{ color: '#0f172a' }}>{users?.find(u => String(u.id) === String(qddr.leader))?.label || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>Approved By:</span> <strong style={{ color: '#0f172a' }}>{users?.find(u => String(u.id) === String(qddr.approved_by))?.label || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>Noted By:</span> <strong style={{ color: '#0f172a' }}>{users?.find(u => String(u.id) === String(qddr.noted_by))?.label || '—'}</strong></div>
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
    </div>
  )
}