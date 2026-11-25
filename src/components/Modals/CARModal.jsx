import { useEffect, useState } from 'react'
import {
  X as CloseIcon,
  Link,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  FileText,
  Sparkles,
  CheckCircle,
  Calendar
} from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'
import {
  formatRcaText,
  parseExistingRca,
  INITIAL_FIVE_WHYS,
  INITIAL_FISHBONE,
  FISHBONE_LABELS
} from '@/hooks/useCARDetails'
import { generateAiSuggestionFromText } from '@/services/suggestionService'

function CARModal({
  isOpen,
  onClose,
  form,
  handleChange,
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
  nonConformanceTypes = [],
  nonConformanceTypesLoading = false,
  products = [],
  productsLoading = false,
  mode = null
}) {
  const isEdit = Boolean(form?.id || mode === 'edit')
  const [isMobile, setIsMobile] = useState(false)
  const [rcaMethod, setRcaMethod] = useState('5whys')
  const [fiveWhys, setFiveWhys] = useState(INITIAL_FIVE_WHYS)
  const [fishbone, setFishbone] = useState(INITIAL_FISHBONE)
  const [rootCauseSummary, setRootCauseSummary] = useState('')
  const [suggestingCapa, setSuggestingCapa] = useState(false)
  const [cbrMeta, setCbrMeta] = useState(null)
  const [cbrError, setCbrError] = useState(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (isOpen && (form?.id || mode === 'edit')) {
      const parsed = parseExistingRca(form.root_cause_analysis || '')
      setRcaMethod(parsed.method || '5whys')
      setFiveWhys(parsed.fiveWhys || INITIAL_FIVE_WHYS)
      setFishbone(parsed.fishbone || INITIAL_FISHBONE)
      setRootCauseSummary(parsed.summary || '')
      setCbrMeta(null)
      setCbrError(null)
    } else if (!isOpen) {
      setRcaMethod('5whys')
      setFiveWhys(INITIAL_FIVE_WHYS)
      setFishbone(INITIAL_FISHBONE)
      setRootCauseSummary('')
      setCbrMeta(null)
      setCbrError(null)
    }
  }, [isOpen, form?.id, form?.root_cause_analysis, mode])

  const updateRcaField = (nextMethod, nextWhys, nextFishbone, nextSummary) => {
    const formatted = formatRcaText(nextMethod, nextWhys, nextFishbone, nextSummary)
    handleChange('root_cause_analysis', formatted)
  }

  const handleMethodChange = (method) => {
    setRcaMethod(method)
    updateRcaField(method, fiveWhys, fishbone, rootCauseSummary)
  }

  const handleFiveWhyChange = (key, val) => {
    const updated = { ...fiveWhys, [key]: val }
    setFiveWhys(updated)
    updateRcaField(rcaMethod, updated, fishbone, rootCauseSummary)
  }

  const handleFishboneChange = (key, val) => {
    const updated = { ...fishbone, [key]: val }
    setFishbone(updated)
    updateRcaField(rcaMethod, fiveWhys, updated, rootCauseSummary)
  }

  const handleSummaryChange = (val) => {
    setRootCauseSummary(val)
    updateRcaField(rcaMethod, fiveWhys, fishbone, val)
  }

  const handleSuggestCapa = async () => {
    const currentRca = formatRcaText(rcaMethod, fiveWhys, fishbone, rootCauseSummary) || form?.root_cause_analysis
    if (!String(currentRca || '').trim()) {
      setCbrError('Please fill in the Root Cause Analysis (5 Whys / Fishbone) first so CBR can suggest appropriate actions.')
      return
    }

    setSuggestingCapa(true)
    setCbrError(null)
    setCbrMeta(null)

    try {
      const result = await generateAiSuggestionFromText({
        description: form?.details_of_nonconformance,
        rootCause: currentRca,
        rcaMethod,
        issueType: form?.type_of_nonconformance || 'general',
        deptName: form?.responsible_department,
        reportType: 'CAR'
      })

      let res = result
      if (result?.jobId) {
        const { fetchJobStatus } = await import('@/services/suggestionService')
        res = await new Promise((resolve, reject) => {
          const maxRetries = 20
          let retries = 0
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
              // ignore
            }
          }, 2000)
        })
      }

      if (res?.suggestion) {
        handleChange('corrective_action', res.suggestion)
      }
      if (res?.preventive_suggestion) {
        handleChange('preventive_action', res.preventive_suggestion)
      }
      if (res?.sourceDetails) {
        setCbrMeta({
          sourceDetails: res.sourceDetails,
          matchedFeatures: res.matchedFeatures || [],
          confidence: res.confidence || 0
        })
      }
    } catch (err) {
      console.error('CBR suggestion failed:', err)
      setCbrError('Could not generate CBR suggestions. Please enter actions manually.')
    } finally {
      setSuggestingCapa(false)
    }
  }

  if (!isOpen) return null

  const filteredUsers = users?.filter((user) => {
    const userRole = String(user.label || '').toUpperCase()
    return !userRole.includes('WAREHOUSE STAFF')
  }) || []

  const hasNonconformanceDetails = Boolean(form?.details_of_nonconformance?.trim())

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: isMobile ? 'calc(100vh - 16px)' : '92vh',
          width: isMobile ? 'calc(100vw - 16px)' : '920px',
          maxWidth: '96vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.2)',
          transform: isMobile ? 'scale(0.86)' : 'none',
          transformOrigin: 'top center'
        }}
      >
        {/* ── ✕ ABSOLUTE CLOSE BUTTON ── */}
        <button 
          type="button" 
          onClick={onClose} 
          className="modal-close-button" 
          title="Close Modal"
          aria-label="Close Modal"
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

        {/* ── 📋 CAR HEADER ROW ── */}
        <div 
          className="modal-header-row" 
          style={{ 
            flexShrink: 0, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingLeft: isMobile ? '16px' : '28px',
            paddingRight: isMobile ? '40px' : '56px',
            paddingTop: isMobile ? '14px' : '20px',
            paddingBottom: isMobile ? '12px' : '16px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div>
            <h3 className="reports-update-title" style={{ margin: 0, fontSize: isMobile ? '15px' : '17px' }}>
              {isEdit ? 'Corrective Action Request (CAR) - Update' : 'Corrective Action Request (CAR)'}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              {isEdit 
                ? 'Update non-conformance details, root cause analysis (RCA), and implement CAPA action plans.' 
                : 'Document non-conformances, assign responsible personnel, and initiate corrective action workflows.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="user-info-error" style={{ margin: '12px 28px 0 28px', flexShrink: 0 }}>
            {error}
          </div>
        )}

        <div 
          className="modal-form-content" 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: isMobile ? '12px 14px' : '20px 28px', 
            background: '#f8fafc' 
          }}
        >
          <form 
            className="modal-form" 
            onSubmit={onSubmit} 
            style={{ gap: isMobile ? '12px' : '16px', display: 'flex', flexDirection: 'column' }}
          >
            {/* ── SECTION 1: Routing & Department Assignments ── */}
            <div className="car-form-section">
              <div className="car-section-title">
                <Users size={15} color="#0891b2" />
                <span>1. Routing &amp; Department Assignments</span>
              </div>

              {/* Row 1: Requesting Dept, Requestor, Date */}
              <div className="car-form-row-3-col">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SearchableDropdown
                    label="Requesting Department:"
                    value={form.requesting_department}
                    onValueChange={(val) => handleChange('requesting_department', val)}
                    options={departments}
                    loading={departmentsLoading}
                    placeholder="Search department..."
                    onSelectOption={(opt) => handleChange('requesting_department', opt.label)}
                    required={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SearchableDropdown
                    label="Requestor:"
                    value={form.requestor}
                    onValueChange={(val) => handleChange('requestor', val)}
                    options={filteredUsers}
                    loading={usersLoading}
                    placeholder="Search user..."
                    onSelectOption={(opt) => handleChange('requestor', opt.label)}
                    required={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Date: <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    max="9999-12-31"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Row 2: Responsible Dept, Recipient, Request Date */}
              <div className="car-form-row-3-col">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SearchableDropdown
                    label="Responsible Department:"
                    value={form.responsible_department}
                    onValueChange={(val) => handleChange('responsible_department', val)}
                    options={departments}
                    loading={departmentsLoading}
                    placeholder="Search department..."
                    onSelectOption={(opt) => handleChange('responsible_department', opt.label)}
                    required={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SearchableDropdown
                    label="Recipient:"
                    value={form.recipient}
                    onValueChange={(val) => handleChange('recipient', val)}
                    options={filteredUsers}
                    loading={usersLoading}
                    placeholder="Search user..."
                    onSelectOption={(opt) => handleChange('recipient', opt.label)}
                    required={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Request Date: <span className="required-asterisk">*</span>
                  </label>
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

              {/* Reason for Re-issue */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                <label className="label-field" style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Reason for Re-issue (Optional):
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: form.no_reply ? '1.5px solid #0891b2' : '1px solid #cbd5e1',
                      background: form.no_reply ? '#ecfeff' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: form.no_reply ? 600 : 400,
                      color: form.no_reply ? '#0e7490' : '#334155',
                      transition: 'all 0.15s ease',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(form.no_reply)}
                      onChange={(e) => handleChange('no_reply', e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#0891b2' }}
                    />
                    <span>No Reply</span>
                  </label>

                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: form.re_corrective_action ? '1.5px solid #0891b2' : '1px solid #cbd5e1',
                      background: form.re_corrective_action ? '#ecfeff' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: form.re_corrective_action ? 600 : 400,
                      color: form.re_corrective_action ? '#0e7490' : '#334155',
                      transition: 'all 0.15s ease',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(form.re_corrective_action)}
                      onChange={(e) => handleChange('re_corrective_action', e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#0891b2' }}
                    />
                    <span>Re-Corrective Action</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: Non-Conformance & Material Details ── */}
            <div className="car-form-section">
              <div className="car-section-title">
                <AlertTriangle size={15} color="#0891b2" />
                <span>2. Non-Conformance Classification</span>
              </div>

              {/* Row 1: Type of Non-Conformance & Others */}
              <div className="car-form-row-2-col">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SearchableDropdown
                    label="Type of Non-Conformance:"
                    value={form.type_of_nonconformance}
                    onValueChange={(val) => handleChange('type_of_nonconformance', val)}
                    options={nonConformanceTypes}
                    loading={nonConformanceTypesLoading}
                    placeholder="Search or enter type..."
                    onSelectOption={(opt) => handleChange('type_of_nonconformance', opt.label)}
                    required={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Others, Pls. Specify:</label>
                  <input
                    type="text"
                    value={form.others || ''}
                    onChange={(e) => handleChange('others', e.target.value)}
                    className="input-field"
                    placeholder="Optional details for others..."
                  />
                </div>
              </div>

              {/* Row 2: Product/Material, Model/Type */}
              <div className="car-form-row-2-col">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SearchableDropdown
                    label="Product / Material Name:"
                    value={form.product_material_name}
                    onValueChange={(val) => handleChange('product_material_name', val)}
                    options={products}
                    loading={productsLoading}
                    placeholder="Search or enter product/material (e.g. Evaporada, Milk...)"
                    onSelectOption={(opt) => handleChange('product_material_name', opt.label)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Model / Type:</label>
                  <input 
                    type="text" 
                    value={form.model_type || ''} 
                    onChange={(e) => handleChange('model_type', e.target.value)} 
                    className="input-field" 
                    placeholder="e.g. 250ml, Master Pack..."
                  />
                </div>
              </div>

              {/* Row 3: Control No., Affected Quantity */}
              <div className="car-form-row-2-col">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Control No.:</label>
                  <input 
                    type="text" 
                    value={form.control_no || ''} 
                    onChange={(e) => handleChange('control_no', e.target.value)} 
                    className="input-field" 
                    placeholder="e.g. CTRL-2026-001"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">Affected Quantity:</label>
                  <input 
                    type="number" 
                    min="0"
                    value={form.affected_quantity ?? ''} 
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
                    placeholder="e.g. 10"
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION 3: Details of Non-Conformance ── */}
            <div className="car-form-section">
              <div className="car-section-title">
                <FileText size={15} color="#0891b2" />
                <span>3. Details of Non-Conformance</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="label-field" style={{ margin: 0 }}>
                  Description: <span className="required-asterisk">*</span>
                </label>
                <textarea
                  value={form.details_of_nonconformance || ''}
                  onChange={(e) => handleChange('details_of_nonconformance', e.target.value)}
                  className="input-field"
                  placeholder="Provide complete details and observations of the non-conformance event..."
                  style={{ width: '100%', minHeight: '110px', height: '110px', padding: '10px 12px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* ── SECTION 4: ISO Clause Linkage ── */}
            <div 
              className="car-form-section" 
              style={{
                background: hasNonconformanceDetails ? '#ffffff' : '#f8fafc',
                border: '1px solid #e2e8f0',
                opacity: hasNonconformanceDetails ? 1 : 0.75,
                transition: 'opacity 0.2s ease, background 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div className="car-section-title">
                  <Link size={15} color={hasNonconformanceDetails ? '#0891b2' : '#64748b'} />
                  <span>4. ISO Clause Linkage &amp; Standards Alignment</span>
                </div>
                <button
                  type="button"
                  className="car-action-btn"
                  disabled={clausesLoading || !hasNonconformanceDetails}
                  onClick={() => fetchClauseSuggestions(userAuthId)}
                  style={{ 
                    background: hasNonconformanceDetails ? '#ecfeff' : '#f1f5f9',
                    border: hasNonconformanceDetails ? '1px solid #0891b2' : '1px solid #cbd5e1',
                    color: hasNonconformanceDetails ? '#0891b2' : '#94a3b8',
                    cursor: hasNonconformanceDetails && !clausesLoading ? 'pointer' : 'not-allowed'
                  }}
                  title={!hasNonconformanceDetails ? 'Fill in Details of Non-Conformance first to suggest ISO clauses' : undefined}
                >
                  {clausesLoading ? (
                    <><LoaderCircle size={13} className="iso-spinner" /> Analyzing...</>
                  ) : (
                    <><Sparkles size={13} /> Suggest Matching Clauses</>
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
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '5px',
                          background: 'rgba(8, 145, 178, 0.1)', 
                          border: '1px solid rgba(8, 145, 178, 0.3)',
                          borderRadius: '6px', 
                          padding: '4px 9px', 
                          fontSize: '12px', 
                          color: '#0891b2', 
                          fontWeight: 500
                        }}
                      >
                        <CheckCircle2 size={12} /> Clause {s.clause_number} – {s.title}
                        <button
                          type="button"
                          onClick={() => toggleClauseSelection(s.clause_id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 0 0 4px', lineHeight: 1 }}
                        >
                          <XCircle size={13} />
                        </button>
                      </span>
                    ))
                  }
                </div>
              )}

              {form.suggested_clauses?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.04em' }}>
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
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '12px', 
                          padding: '9px 12px', 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          background: isConfirmed ? 'rgba(8, 145, 178, 0.08)' : '#f8fafc',
                          border: isConfirmed ? '1px solid rgba(8, 145, 178, 0.35)' : '1px solid #e2e8f0',
                          textAlign: 'left', 
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <span style={{ fontSize: '13px', color: '#1A435A', fontWeight: isConfirmed ? '600' : '400' }}>
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
                <p style={{ fontSize: '12px', color: hasNonconformanceDetails ? '#475569' : '#94a3b8', margin: 0 }}>
                  Fill in the non-conformance details above, then click "Suggest Matching Clauses" to automatically identify the relevant ISO clauses for this CAR.
                </p>
              )}
            </div>

            {/* ── SECTION 5: IMPLEMENT CAPA ACTION PLAN (Shown when updating/editing CAR) ── */}
            {isEdit && (
              <div className="car-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div className="car-section-title" style={{ margin: 0 }}>
                    <CheckCircle2 size={15} color="#0891b2" />
                    <span>5. Implement CAPA Action Plan</span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Root Cause Analysis &amp; Corrective/Preventive Action Plans
                  </span>
                </div>

                {/* Sub-section 1: Root Cause Analysis (RCA) */}
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
                      <label className="label-field" style={{ marginBottom: '2px', display: 'block', color: '#1A435A', fontWeight: 600, fontSize: '13px' }}>
                        1. Root Cause Analysis (RCA)
                      </label>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Investigate the root cause using 5 Whys, Fishbone (6M), or Both. Your RCA will serve as the basis for CBR action suggestions.
                      </span>
                    </div>

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
                            onClick={() => handleMethodChange(tab.id)}
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
                  </div>

                  {/* Fishbone (6M) Contributing Factors */}
                  {(rcaMethod === 'fishbone' || rcaMethod === 'both') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Fishbone (6M) Contributing Factors
                      </span>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '8px'
                      }}>
                        {FISHBONE_LABELS.map((bone) => (
                          <div key={bone.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                              {bone.label}
                            </label>
                            <input
                              type="text"
                              value={fishbone[bone.key] || ''}
                              onChange={(e) => handleFishboneChange(bone.key, e.target.value)}
                              placeholder={`e.g. Factor for ${bone.label}...`}
                              className="input-field"
                              style={{ padding: '6px 8px', fontSize: '12px', background: '#ffffff' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5 Whys Cause Chain */}
                  {(rcaMethod === '5whys' || rcaMethod === 'both') && (
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

                  {/* Concluding Root Cause Statement */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="label-field" style={{ fontSize: '12px', fontWeight: 600 }}>
                      Concluding Root Cause Statement:
                    </label>
                    <textarea
                      value={rootCauseSummary}
                      onChange={(e) => handleSummaryChange(e.target.value)}
                      className="input-field"
                      placeholder="Summarize the primary root cause identified from your 5 Whys / Fishbone analysis..."
                      style={{ height: '64px', padding: '8px', fontSize: '13px', resize: 'vertical', background: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* Sub-section 2: Corrective & Preventive Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A435A' }}>
                        2. Corrective &amp; Preventive Actions
                      </span>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                        Uses Non-Conformance Details + your Root Cause Analysis above to retrieve matching past cases.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSuggestCapa}
                      disabled={suggestingCapa}
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
                        cursor: suggestingCapa ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Sparkles size={13} /> {suggestingCapa ? 'Matching RCA & Cases...' : 'Suggest Actions from RCA (CBR)'}
                    </button>
                  </div>

                  {cbrError && (
                    <div style={{ color: '#dc2626', fontSize: '12px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px' }}>
                      {cbrError}
                    </div>
                  )}

                  {cbrMeta && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                        background: 'rgba(59,130,246,0.1)', color: '#2563eb',
                        border: '1px solid rgba(59,130,246,0.2)'
                      }}>
                        Source: {cbrMeta.sourceDetails}
                      </span>
                      {cbrMeta.matchedFeatures?.length > 0 && (
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                          background: 'rgba(16,185,129,0.1)', color: '#059669',
                          border: '1px solid rgba(16,185,129,0.2)'
                        }}>
                          ✓ {cbrMeta.matchedFeatures.join(' · ')}
                        </span>
                      )}
                      {cbrMeta.confidence > 0 && (
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                          background: 'rgba(16,185,129,0.1)', color: '#059669',
                          border: '1px solid rgba(16,185,129,0.2)'
                        }}>
                          {Math.round(cbrMeta.confidence * 100)}% match
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="label-field" style={{ fontWeight: 600 }}>
                      Immediate Corrective Action (Correction)
                    </label>
                    <textarea
                      value={form.corrective_action || ''}
                      onChange={(e) => handleChange('corrective_action', e.target.value)}
                      placeholder="Enter immediate corrective actions taken..."
                      className="input-field"
                      style={{ minHeight: '80px', height: '80px', padding: '8px 10px', fontSize: '13px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="label-field" style={{ fontWeight: 600 }}>
                      Preventive Action Plan
                    </label>
                    <textarea
                      value={form.preventive_action || ''}
                      onChange={(e) => handleChange('preventive_action', e.target.value)}
                      placeholder="Enter long-term actions to prevent re-occurrence..."
                      className="input-field"
                      style={{ minHeight: '80px', height: '80px', padding: '8px 10px', fontSize: '13px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: isMobile ? '100%' : '320px' }}>
                    <label className="label-field" style={{ fontWeight: 600 }}>
                      Target Verification Date (VoE Date)
                    </label>
                    <input
                      type="date"
                      value={form.target_verification_date || ''}
                      onChange={(e) => handleChange('target_verification_date', e.target.value)}
                      className="input-field"
                      style={{ height: '38px', padding: '8px', fontSize: '13px', background: '#ffffff' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* ── MODAL FOOTER ACTION BAR ── */}
        <div 
          className="modal-footer-actions"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            padding: isMobile ? '12px 14px' : '16px 28px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0'
          }}
        >
          <button 
            type="button" 
            className="btn-secondary-light" 
            onClick={onClose} 
            disabled={isSubmitting} 
            style={{ margin: 0, padding: '8px 20px', fontSize: '13px' }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn-gradient-primary" 
            disabled={isSubmitting}
            onClick={onSubmit}
            style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LoaderCircle size={16} className="iso-spinner" /> Submitting…
              </span>
            ) : (form.id ? 'Update CAR' : 'Submit CAR')}
          </button>
        </div>

      </div>
    </div>
  )
}

export default CARModal
