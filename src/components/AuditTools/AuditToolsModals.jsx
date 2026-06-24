import { LoaderCircle, BookOpen } from 'lucide-react'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #cbd5e1', paddingBottom: '12px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Audit Checklist: {activeRun.title}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Standard: {activeRun.standard_name}</p>
        </div>
        <button className="sidebar-button" onClick={() => { setActiveRun(null); fetchData(); }} style={{ borderColor: '#cbd5e1' }}>
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
          <p style={{ color: '#64748b', textAlign: 'center' }}>No clauses found for this ISO standard. Please add clauses first.</p>
        ) : (
          activeClauses.map(clause => {
            const answer = resultsMap[clause.id] || { status: 'compliant', evidence: '', notes: '' }
            return (
              <div key={clause.id} className="settings-container--profile" style={{ minHeight: 'auto', padding: '16px', background: '#f8fafc', border: '1px solid #cbd5e1', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#0891b2', marginRight: '8px' }}>Clause {clause.clause_number}</span>
                    <h4 style={{ margin: 0, display: 'inline', fontSize: '14px', color: '#0f172a' }}>{clause.title}</h4>
                    {clause.requirement ? (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(8, 145, 178, 0.05)', borderLeft: '3px solid #0891b2', borderRadius: '0 4px 4px 0' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>
                          <strong style={{ color: '#0891b2' }}>Requirement: </strong>{clause.requirement}
                        </p>
                        {clause.what_to_look_for && (
                          <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                            <strong style={{ color: '#475569' }}>What to look for: </strong>{clause.what_to_look_for}
                          </p>
                        )}
                      </div>
                    ) : (
                      clause.description && <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>{clause.description}</p>
                    )}
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
                            border: isActive ? `1px solid ${textMap[statusVal]}` : '1px solid #cbd5e1',
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

                <div className="form-row-2" style={{ margin: 0, gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Evidence / Observations</label>
                    <input
                      type="text"
                      placeholder="Enter evidence or observations found..."
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
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Findings / CAR Notes</label>
                    <input
                      type="text"
                      placeholder="Add findings notes or links to Corrective Actions..."
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      value={answer.notes || ''}
                      onChange={(e) => {
                        setResultsMap({
                          ...resultsMap,
                          [clause.id]: { ...answer, notes: e.target.value }
                        })
                      }}
                    />
                  </div>
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '16px', width: '100%' }}>
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
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
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
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          borderRadius: '16px',
          padding: '24px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
              Audit Details: {selectedRunDetails.title}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
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
              const result = runResults.find(r => r.clause_id === clause.id) || { status: 'na', evidence: '', notes: '', requirement: '', what_to_look_for: '' }
              
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
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0891b2', marginRight: '8px' }}>
                        Clause {clause.clause_number}
                      </span>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                        {clause.title}
                      </strong>
                    </div>
                    <span style={{ fontSize: '11px', background: badge.bg, color: badge.text, padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0 }}>
                      {badge.label}
                    </span>
                  </div>

                  {result.requirement && (
                    <div style={{ fontSize: '12.5px', color: '#334155', padding: '6px 10px', background: 'rgba(8, 145, 178, 0.05)', borderLeft: '2px solid #0891b2', borderRadius: '0 4px 4px 0' }}>
                      <p style={{ margin: 0 }}><strong>Requirement:</strong> {result.requirement}</p>
                      {result.what_to_look_for && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}><strong>What to look for:</strong> {result.what_to_look_for}</p>}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {result.evidence && (
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px' }}>
                        <span style={{ color: '#475569', fontWeight: 'bold' }}>Evidence: </span>
                        {result.evidence}
                      </p>
                    )}
                    {result.notes && (
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px' }}>
                        <span style={{ color: '#475569', fontWeight: 'bold' }}>Findings Notes: </span>
                        {result.notes}
                      </p>
                    )}
                    {clause.linked_cars && clause.linked_cars.length > 0 && (
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0 }}>Linked CARs:</span>
                        {clause.linked_cars.map(car => (
                          <div 
                            key={car.id} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              background: '#fffbeb', 
                              border: '1px solid #fde68a', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              color: '#b45309', 
                              gap: '6px' 
                            }}
                          >
                            <BookOpen size={10} />
                            {car.title} ({car.status})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
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
