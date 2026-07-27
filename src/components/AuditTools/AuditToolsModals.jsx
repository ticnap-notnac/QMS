import { LoaderCircle, BookOpen, Paperclip, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../utils/supabase'

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
  linkedQddrsMap,
  handleRemoveCarLink,
  handleRemoveQddrLink,
  onSelectCar,
  onSelectQddr
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(activeClauses.length / itemsPerPage)
  const paginatedClauses = activeClauses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const [uploadingFiles, setUploadingFiles] = useState({})

  const handleFileUpload = async (e, clauseId) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingFiles(prev => ({ ...prev, [clauseId]: true }))
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${activeRun.id}/${fileName}`

      const { data, error } = await supabase.storage
        .from('audit-evidence')
        .upload(filePath, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('audit-evidence')
        .getPublicUrl(filePath)

      const currentAnswer = resultsMap[clauseId] || { status: 'compliant', evidence: '', notes: '' }
      setResultsMap({
        ...resultsMap,
        [clauseId]: { ...currentAnswer, attachment_url: urlData.publicUrl }
      })
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploadingFiles(prev => ({ ...prev, [clauseId]: false }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header Info */}
      <div className="iso-card" style={{ marginBottom: '24px', padding: '16px 20px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
            Audit Checklist: {activeRun?.audit_schedules?.audit_checklist_templates?.title || 'Custom'}
          </h3>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Standard: {activeRun?.audit_schedules?.iso_standards?.name} ({activeRun?.audit_schedules?.iso_standards?.version})
          </span>
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            setActiveRun(null)
            fetchData()
          }}
        >
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px', width: '100%', overflowX: 'auto' }}>
        {activeClauses.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center' }}>No clauses found for this ISO standard. Please add clauses first.</p>
        ) : (
          <div className="iso-table-wrap">
            <table className="iso-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Clause</th>
                  <th style={{ width: '25%' }}>What To Look for and how?</th>
                  <th style={{ width: '25%' }}>Evidence / Observation</th>
                  <th style={{ width: '25%' }}>Findings</th>
                  <th style={{ width: '120px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClauses.map(clause => {
                  const answer = resultsMap[clause.id] || { status: 'compliant', evidence: '', notes: '' }
                  return (
                    <tr key={clause.id}>
                      <td style={{ verticalAlign: 'top' }}>
                        <strong style={{ color: '#0891b2', display: 'block', marginBottom: '4px' }}>Clause {clause.clause_number}</strong>
                        <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{clause.title}</span>
                      </td>
                      <td style={{ verticalAlign: 'top', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                        {clause.requirement && (
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Requirement:</strong><br/>
                            {clause.requirement}
                          </div>
                        )}
                        {clause.what_to_look_for && (
                          <div style={{ color: '#64748b' }}>
                            <strong>Guide:</strong><br/>
                            {clause.what_to_look_for}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <textarea
                          className="form-input-reports"
                          rows={4}
                          placeholder="Enter evidence..."
                          value={answer.evidence || ''}
                          onChange={(e) => {
                            setResultsMap({
                              ...resultsMap,
                              [clause.id]: { ...answer, evidence: e.target.value }
                            })
                          }}
                          style={{ marginBottom: '8px', fontSize: '13px' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#0891b2',
                            background: 'rgba(8, 145, 178, 0.1)',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {uploadingFiles[clause.id] ? <LoaderCircle size={14} className="spin" /> : <Paperclip size={14} />}
                            {uploadingFiles[clause.id] ? 'Uploading...' : 'Attach File'}
                            <input
                              type="file"
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileUpload(e, clause.id)}
                            />
                          </label>
                          {answer.attachment_url && (
                            <a href={answer.attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={14} /> View File
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <textarea
                          className="form-input-reports"
                          rows={4}
                          placeholder="Enter findings / CAR notes..."
                          value={answer.notes || ''}
                          onChange={(e) => {
                            setResultsMap({
                              ...resultsMap,
                              [clause.id]: { ...answer, notes: e.target.value }
                            })
                          }}
                          style={{ marginBottom: '8px', fontSize: '13px' }}
                        />
                        {/* Linked CARs & QDDRs display could go here if needed, or omitted for compactness */}
                        {linkedCarsMap && linkedCarsMap[clause.id]?.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>
                            Linked CARs: {linkedCarsMap[clause.id].map(car => car.reference_no).join(', ')}
                          </div>
                        )}
                        {linkedQddrsMap && linkedQddrsMap[clause.id]?.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>
                            Linked QDDRs: {linkedQddrsMap[clause.id].map(qddr => qddr.reference_no).join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <select
                          className="form-input-reports"
                          value={answer.status || 'compliant'}
                          onChange={(e) => {
                            setResultsMap({
                              ...resultsMap,
                              [clause.id]: { ...answer, status: e.target.value }
                            })
                          }}
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            padding: '6px',
                            color: answer.status === 'compliant' ? '#10b981' : 
                                   answer.status === 'non_compliant' ? '#ef4444' : 
                                   answer.status === 'partial' ? '#f59e0b' : '#64748b'
                          }}
                        >
                          <option value="compliant">Compliant</option>
                          <option value="partial">Partial</option>
                          <option value="non_compliant">Non-Compliant</option>
                          <option value="na">N/A</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '16px', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="sidebar-button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Previous
          </button>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="sidebar-button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Next
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
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
                    {clause.linked_qddrs && clause.linked_qddrs.length > 0 && (
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0 }}>Linked QDDRs:</span>
                        {clause.linked_qddrs.map(qddr => (
                          <div 
                            key={qddr.id} 
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
                            📦 {qddr.title || qddr.reference_no} ({qddr.status})
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
            className="btn btn-outline"
            style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => handlePrintReport(selectedRunDetails)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            PDF Report
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
