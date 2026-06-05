import { LoaderCircle } from 'lucide-react'

export function AuditChecklistSection({
  activeRun,
  error,
  success,
  activeClauses,
  resultsMap,
  setResultsMap,
  savingProgress,
  handleSaveResults,
  setActiveRun,
  fetchData,
  linkedCarsMap,
  handleRemoveCarLink,
  onSelectCar
}) {
  if (!activeRun) return null



  return (
    <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Audit Checklist: {activeRun.title}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Standard: {activeRun.standard_name}</p>
        </div>
        <button className="sidebar-button" onClick={() => { setActiveRun(null); fetchData(); }} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          Go Back
        </button>
      </div>

      {error && (
        <div className="iso-inline-message iso-inline-message--error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="iso-inline-message iso-inline-message--success" style={{ marginBottom: '16px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px', width: '100%' }}>
        {activeClauses.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>No clauses found for this ISO standard. Please add clauses first.</p>
        ) : (
          activeClauses.map(clause => {
            const answer = resultsMap[clause.id] || { status: 'compliant', evidence: '' }
            return (
              <div key={clause.id} className="settings-container--profile" style={{ minHeight: 'auto', padding: '16px', background: 'rgba(15, 23, 42, 0.25)', border: '1px solid rgba(255,255,255,0.05)', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#22d3ee', marginRight: '8px' }}>Clause {clause.clause_number}</span>
                    <h4 style={{ margin: 0, display: 'inline', fontSize: '14px', color: '#f8fafc' }}>{clause.title}</h4>
                    {clause.description && <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>{clause.description}</p>}
                  </div>
                  
                  {/* Status selectors */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['compliant', 'partial', 'non_compliant', 'na'].map(statusVal => {
                      const labelMap = {
                        compliant: 'Compliant',
                        partial: 'Partial',
                        non_compliant: 'Non-Compliant',
                        na: 'N/A'
                      }
                      const colorMap = {
                        compliant: 'rgba(16, 185, 129, 0.15)',
                        partial: 'rgba(245, 158, 11, 0.15)',
                        non_compliant: 'rgba(239, 68, 68, 0.15)',
                        na: 'rgba(100, 116, 139, 0.15)'
                      }
                      const textMap = {
                        compliant: '#10b981',
                        partial: '#f59e0b',
                        non_compliant: '#ef4444',
                        na: '#94a3b8'
                      }
                      
                      const isActive = answer.status === statusVal
                      return (
                        <button
                          key={statusVal}
                          type="button"
                          onClick={() => {
                            setResultsMap({
                              ...resultsMap,
                              [clause.id]: { ...answer, status: statusVal }
                            })
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: isActive ? `1px solid ${textMap[statusVal]}` : '1px solid rgba(255,255,255,0.06)',
                            background: isActive ? colorMap[statusVal] : 'transparent',
                            color: isActive ? textMap[statusVal] : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {labelMap[statusVal]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Evidence / Audit Notes..."
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    value={answer.evidence}
                    onChange={(e) => {
                      setResultsMap({
                        ...resultsMap,
                        [clause.id]: { ...answer, evidence: e.target.value }
                      })
                    }}
                  />
                </div>

                {/* Linked CARs row */}
                {linkedCarsMap && linkedCarsMap[clause.id]?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', paddingTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0 }}>Linked CARs:</span>
                    {linkedCarsMap[clause.id].map(car => {
                      const statusConfig = {
                        open:               { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)', label: 'Open' },
                        under_verification: { bg: 'rgba(34, 211, 238, 0.10)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.3)', label: 'Under Verification' },
                        closed:             { bg: 'rgba(16, 185, 129, 0.10)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)', label: 'Closed' },
                      }
                      const s = statusConfig[car.status] || statusConfig.open
                      return (
                        <span
                          key={car.id}
                          onClick={() => {
                            console.log('CAR badge clicked! car:', car);
                            console.log('onSelectCar function:', onSelectCar);
                            if (onSelectCar) {
                              onSelectCar(car);
                            } else {
                              console.warn('onSelectCar is undefined!');
                            }
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', fontWeight: '600',
                            background: s.bg, color: s.text,
                            border: `1px solid ${s.border}`,
                            borderRadius: '4px', padding: '2px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          📋 {car.reference_no} <span style={{ opacity: 0.7, fontWeight: 'normal' }}>({s.label})</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveCarLink && handleRemoveCarLink(car.id, clause.id)
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: s.text,
                              cursor: 'pointer',
                              padding: '0 0 0 4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '10px',
                              opacity: 0.7
                            }}
                            title="Remove Link"
                            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                          >
                            ✕
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', width: '100%' }}>
        <button
          type="button"
          className="sidebar-button"
          onClick={() => handleSaveResults(false)}
          disabled={savingProgress || activeClauses.length === 0}
        >
          {savingProgress ? 'Saving...' : 'Save Progress'}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleSaveResults(true)}
          disabled={savingProgress || activeClauses.length === 0}
        >
          {savingProgress ? 'Completing...' : 'Complete Audit'}
        </button>
      </div>
    </div>
  )
}

export function AuditRunDetailsModal({
  isDetailsModalOpen,
  selectedRunDetails,
  setIsDetailsModalOpen,
  loadingRunDetails,
  runClauses,
  runResults,
  handlePrintReport
}) {
  if (!isDetailsModalOpen || !selectedRunDetails) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(2, 6, 12, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        boxSizing: 'border-box'
      }}
      onClick={() => setIsDetailsModalOpen(false)}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '750px',
          background: 'rgba(13, 26, 45, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: '24px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
              Audit Details: {selectedRunDetails.title}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              Standard: {selectedRunDetails.standard_name} | Auditor: {selectedRunDetails.auditor_name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDetailsModalOpen(false)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
          {loadingRunDetails ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
              <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
              Loading checklist findings...
            </div>
          ) : runClauses.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>No evaluated clauses found.</div>
          ) : (
            runClauses.map((clause) => {
              const result = runResults.find(r => r.clause_id === clause.id) || { status: 'na', evidence: '' }
              
              const statusColors = {
                compliant: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', label: 'Compliant' },
                partial: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', label: 'Partial' },
                non_compliant: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: 'Non-Compliant' },
                na: { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', label: 'N/A' }
              }
              const badge = statusColors[result.status] || statusColors.na

              return (
                <div
                  key={clause.id}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--cyan-light, #22d3ee)', marginRight: '8px' }}>
                        Clause {clause.clause_number}
                      </span>
                      <strong style={{ fontSize: '13.5px', color: '#f8fafc' }}>
                        {clause.title}
                      </strong>
                    </div>
                    <span style={{ fontSize: '11px', background: badge.bg, color: badge.text, padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0 }}>
                      {badge.label}
                    </span>
                  </div>
                  {result.evidence && (
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '4px', fontStyle: 'italic' }}>
                      <span style={{ color: '#64748b', fontWeight: 'bold', fontStyle: 'normal' }}>Notes: </span>
                      {result.evidence}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          <button
            type="button"
            className="sidebar-button"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={() => handlePrintReport(selectedRunDetails)}
          >
            Print Report
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={() => setIsDetailsModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
