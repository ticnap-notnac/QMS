import { useState, useEffect } from 'react'
import { X as CloseIcon, Clipboard, CheckCircle, User, Calendar, Sparkles, Star } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'
import { generateAiSuggestionFromText } from '../../services/suggestionService'
import { rateQddrReport } from '../../services/qddrService'
import { useAuth } from '@/hooks/useAuth'
import { isAdminRole } from '@/utils/roleUtils.js'
import StarRatingAction from '../UI/StarRatingAction.jsx'

export default function QDDRDetailsModal({
  isOpen,
  onClose,
  qddr,
  onUpdateQddr,
  onRateQddr,
  users,
  usersLoading,
  userRole,
  userPermissions,
  authUserId,
  readOnly = false
}) {
  const { user: authUser } = useAuth()
  const resolvedAuthId = authUserId || authUser?.id || ''

  const [correctiveAction, setCorrectiveAction] = useState('')
  const [preventiveAction, setPreventiveAction] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [notedBy, setNotedBy] = useState('')
  const [leader, setLeader] = useState('')
  const [status, setStatus] = useState('open')
  const [submitting, setSubmitting] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestionMeta, setSuggestionMeta] = useState(null)
  const [error, setError] = useState('')
  const [localMyRating, setLocalMyRating] = useState(null)
  const [localAvgRating, setLocalAvgRating] = useState(null)
  const [localRatingsCount, setLocalRatingsCount] = useState(0)

  const resolveName = (userId, fallbackName = '') => {
    if (!userId && !fallbackName) return ''
    const found = users?.find(u => Number(u.id) === Number(userId) || String(u.id) === String(userId))
    if (found) return found.label
    if (fallbackName) return fallbackName
    return /^\d+$/.test(String(userId)) ? '' : String(userId)
  }

  // Sync state with selected QDDR details
  useEffect(() => {
    if (qddr) {
      setCorrectiveAction(qddr.corrective_action || '')
      setPreventiveAction(qddr.preventive_action || '')
      setApprovedBy(resolveName(qddr.approved_by, qddr.approved_by_name))
      setNotedBy(resolveName(qddr.noted_by, qddr.noted_by_name))
      setLeader(resolveName(qddr.leader, qddr.leader_name))
      setStatus(qddr.status || 'open')
      setLocalMyRating(qddr.my_rating ?? null)
      setLocalAvgRating(qddr.average_rating ?? null)
      setLocalRatingsCount(Number(qddr.ratings_count || 0))
      setSuggestionMeta(null)
      setError('')
    }
  }, [qddr, users])

  if (!isOpen || !qddr) return null

  const handleModalRateQddr = async (starValue) => {
    if (typeof onRateQddr === 'function') {
      const res = await onRateQddr(qddr.id, starValue)
      setLocalMyRating(res?.my_rating ?? starValue)
      setLocalAvgRating(res?.average_rating ?? starValue)
      setLocalRatingsCount(res?.ratings_count ?? 1)
    } else if (resolvedAuthId) {
      const res = await rateQddrReport(qddr.id, starValue, resolvedAuthId)
      setLocalMyRating(res?.my_rating ?? starValue)
      setLocalAvgRating(res?.average_rating ?? starValue)
      setLocalRatingsCount(res?.ratings_count ?? 1)
    }
  }

  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const hasExplicitRights = Array.isArray(userPermissions?.rights)
  const rights = hasExplicitRights ? userPermissions.rights : []
  const canCloseQddr =
    isAdminRole(userRole) ||
    ['qa officer', 'auditor', 'quality assurance', 'department manager'].includes(normalizedRole) ||
    (hasExplicitRights ? rights.includes('accept_decline_report') : false)

  const handleSuggestActions = async () => {
    setSuggesting(true)
    setError('')
    setSuggestionMeta(null)
    try {
      const result = await generateAiSuggestionFromText({
        description: qddr.reason_of_discrepancy,
        issueType: 'quality',
        deptName: qddr.location,
        reportType: 'QDDR'
      })

      let res = result;
      if (result?.jobId) {
        const { fetchJobStatus } = await import('../../services/suggestionService')
        res = await new Promise((resolve, reject) => {
            const maxRetries = 20;
            let retries = 0;
            const interval = setInterval(async () => {
                try {
                    const status = await fetchJobStatus(result.jobId, result.queue)
                    if (status.state === 'completed') {
                        clearInterval(interval)
                        resolve(status.output)
                    } else if (status.state === 'failed' || status.state === 'cancelled') {
                        clearInterval(interval)
                        reject(new Error('Background job failed'))
                    }
                    if (++retries >= maxRetries) {
                        clearInterval(interval)
                        reject(new Error('Background job timeout'))
                    }
                } catch (e) {
                    // ignore network errors
                }
            }, 3000)
        })
      }
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
      setError(err?.message || 'The QDDR report could not be updated. Please try again.')
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
          <h3 className="reports-update-title" style={{ margin: 0 }}>
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
          <div 
            className="modal-metadata-grid"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              fontSize: '13px'
            }}
          >
            <div><span style={{ color: 'var(--muted)' }}>Location:</span> <strong style={{ color: '#1A435A' }}>{qddr.location || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Date:</span> <strong style={{ color: '#1A435A' }}>{qddr.date ? new Date(qddr.date).toLocaleDateString() : '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Time:</span> <strong style={{ color: '#1A435A' }}>{qddr.time || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>Trucker / Broker:</span> <strong style={{ color: '#1A435A' }}>{qddr.trucker_broker || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Plate Number:</span> <strong style={{ color: '#1A435A' }}>{qddr.plate_number || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Container Number:</span> <strong style={{ color: '#1A435A' }}>{qddr.container_number || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>PO Reference:</span> <strong style={{ color: '#1A435A' }}>{qddr.po_reference || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>DR / WB Number:</span> <strong style={{ color: '#1A435A' }}>{qddr.drwb_number || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Brand / Supplier:</span> <strong style={{ color: '#1A435A' }}>{qddr.brand_supplier || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>Material:</span> <strong style={{ color: '#1A435A' }}>{qddr.material_description || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Material Code:</span> <strong style={{ color: '#1A435A' }}>{qddr.material_code || '—'}</strong></div>
            <div><span style={{ color: 'var(--muted)' }}>Batch / ISU No:</span> <strong style={{ color: '#1A435A' }}>{qddr.batch_code_su_number || '—'}</strong></div>
            
            <div><span style={{ color: 'var(--muted)' }}>Quantity:</span> <strong style={{ color: '#1A435A' }}>{qddr.qty || '—'}</strong></div>
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
              color: '#1A435A',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>{qddr.reason_of_discrepancy}</div>
          </div>

          {/* Evidence / Attachments */}
          {Array.isArray(qddr.evidence_urls) && qddr.evidence_urls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-field" style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Evidence / Attachments ({qddr.evidence_urls.length})
              </label>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '12px',
                borderRadius: '6px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {qddr.evidence_urls.map((url, idx) => {
                  const lower = String(url || '').toLowerCase()
                  const isImg = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower) || lower.startsWith('data:image/')
                  const label = url.startsWith('data:')
                    ? `Evidence Photo ${idx + 1}`
                    : decodeURIComponent(url.split('/').pop()?.split('?')[0] || `Attachment ${idx + 1}`)
                  return isImg ? (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Click to view full image"
                      style={{
                        display: 'block',
                        width: '120px',
                        height: '90px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc'
                      }}
                    >
                      <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ) : (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0891b2',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        textDecoration: 'none'
                      }}
                    >
                      📄 {label}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

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
                    disabled={!canCloseQddr && status !== 'closed'}
                    className="input-field"
                    style={{ padding: '6px 12px', fontSize: '13px', width: '120px' }}
                  >
                    <option value="open">Open</option>
                    {(canCloseQddr || status === 'closed') && <option value="closed">Closed</option>}
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
              <h4 style={{ color: '#1A435A', fontSize: '14px', margin: '0' }}>Resolution Details</h4>
              
              <div className="modal-metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Corrective Action:</span>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#1A435A',
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
                    color: '#1A435A',
                    marginTop: '4px'
                  }}>{qddr.preventive_action || '—'}</div>
                </div>
              </div>

              <div className="modal-metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '13px', borderTop: '1px solid #cbd5e1', paddingTop: '12px' }}>
                <div><span style={{ color: 'var(--muted)' }}>Leader / Supervisor:</span> <strong style={{ color: '#1A435A' }}>{resolveName(qddr.leader, qddr.leader_name) || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>Approved By:</span> <strong style={{ color: '#1A435A' }}>{resolveName(qddr.approved_by, qddr.approved_by_name) || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>Noted By:</span> <strong style={{ color: '#1A435A' }}>{resolveName(qddr.noted_by, qddr.noted_by_name) || '—'}</strong></div>
              </div>
            </div>
          )}

          {/* Multi-User 5-Star Rating Section when Closed */}
          {String(qddr.status || '').toLowerCase() === 'closed' && (
            <div 
              className="modal-cbr-rating-banner"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={15} color="#eab308" fill="#eab308" /> Rate Discrepancy Resolution (CBR Feedback)
                </span>
                <span style={{ fontSize: '12px', color: '#b45309' }}>
                  Your 1–5 star rating updates the overall case effectiveness score for future CBR suggestions.
                </span>
              </div>
              <StarRatingAction
                myRating={localMyRating}
                averageRating={localAvgRating}
                ratingsCount={localRatingsCount}
                onRate={handleModalRateQddr}
                variant="detailed"
              />
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
