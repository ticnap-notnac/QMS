import { useNavigate } from 'react-router-dom'
import Toast from '../components/UI/Toast.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import Tooltip from '../components/UI/Tooltip.jsx'
import { AlertTriangle, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { ISOModulesModal, ISOTaskSelectionModal, ISOSubTaskModal, ISOTemplatesModal } from '../components/ISOPage/ISOModals.jsx'
import useISOLogic from '../hooks/useISOLogic'
import './ISOPage.css'

import { isAdminRole } from '@/utils/roleUtils.js'

export default function ISOPage({ userRole, userPermissions, userName }) {
  const navigate = useNavigate()
  const hasExplicitRights = Array.isArray(userPermissions?.rights)
  const rights = hasExplicitRights ? userPermissions.rights : []
  const canManageIso = isAdminRole(userRole) || (hasExplicitRights ? rights.includes('manage_iso') : String(userRole || '').toLowerCase() === 'auditor')
  const {
    toast, setToast, totalFindings, fetchActiveModules, compliantCount, ofiCount, minorNcCount, majorNcCount, nonCompliantFindings,
    createdCars, handleOpenCarModal, modulesModalProps, taskSelectionModalProps, carModalProps, isAuditTaskModalOpen,
    setIsAuditTaskModalOpen, isCapaTaskModalOpen, setIsCapaTaskModalOpen, isDocumentTaskModalOpen, setIsDocumentTaskModalOpen,
    isTrainingTaskModalOpen, setIsTrainingTaskModalOpen, handleTaskCreation,
    isTemplatesModalOpen, loadingTemplates, templates, selectedTemplate, setSelectedTemplate,
    fetchAndOpenTemplates, closeTemplatesModal
  } = useISOLogic({ userName })



  return (
    <main className="page-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-main iso-page-main">
        <div className="iso-top-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="iso-overview-header-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>ISO Compliance Overview</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Monitor your quality management metrics and findings.</p>
            </div>
            {canManageIso && (
              <div className="iso-overview-header-buttons" style={{ display: 'flex', gap: '12px' }}>
                <Tooltip content="Manage and activate ISO standards modules (e.g. ISO 9001, ISO 22000)" position="bottom">
                  <button type="button" className="btn-metric-card" style={{ background: '#090d16', color: '#fff' }} onClick={fetchActiveModules}>ISO Modules</button>
                </Tooltip>
                <Tooltip content="Configure and manage audit checklist question templates" position="bottom">
                  <button type="button" className="btn-metric-card" style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }} onClick={() => navigate('/audit-tools?tab=Templates')}>Audit Checklist Templates</button>
                </Tooltip>
              </div>
            )}
          </div>

          <div className="iso-metrics-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <Tooltip content="Total number of ISO standard clauses verified as fully compliant across all audit reviews." position="bottom" className="full-width">
              <div className="metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderTop: '4px solid #16a34a', cursor: 'help' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  COMPLIANT CLAUSES
                  <HelpCircle size={14} style={{ opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#16a34a', marginTop: '8px' }}>{compliantCount}</div>
              </div>
            </Tooltip>
            
            <Tooltip content="Total audit findings recorded (including Opportunities for Improvement, Minor NCs, and Major NCs)." position="bottom" className="full-width">
              <div className="metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderTop: '4px solid #f59e0b', cursor: 'help' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  TOTAL FINDINGS
                  <HelpCircle size={14} style={{ opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b', marginTop: '8px' }}>{totalFindings}</div>
              </div>
            </Tooltip>

            <Tooltip content="Total active Minor and Major Non-Conformances requiring corrective actions." position="bottom" className="full-width">
              <div className="metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderTop: '4px solid #dc2626', cursor: 'help' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  NON-COMPLIANT
                  <HelpCircle size={14} style={{ opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#dc2626', marginTop: '8px' }}>{majorNcCount + minorNcCount}</div>
              </div>
            </Tooltip>
          </div>
        </div>

        <div className="metric-card metric-card--padded iso-review-card" style={{ padding: '24px', height: 'auto', minHeight: 'max-content' }}>
          <h3 className="metric-card-title iso-review-title" style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Review Clause Status</h3>
          <div className="iso-progress-stack iso-progress-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <Tooltip content="Audited items that fully satisfy and follow all required ISO standard clause specifications." position="top" className="full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', cursor: 'help' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#166534' }}>Compliant</span>
                  <HelpCircle size={14} style={{ color: '#16a34a', opacity: 0.7 }} />
                </div>
                <span style={{ fontWeight: 'bold', color: '#15803d', fontSize: '18px' }}>{compliantCount}</span>
              </div>
            </Tooltip>

            <Tooltip content="Observations or areas where efficiency can be improved to prevent future non-conformance. No mandatory corrective action required." position="top" className="full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'help' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#1e40af' }}>Opportunity for Improvement (OFI)</span>
                  <HelpCircle size={14} style={{ color: '#2563eb', opacity: 0.7 }} />
                </div>
                <span style={{ fontWeight: 'bold', color: '#1d4ed8', fontSize: '18px' }}>{ofiCount}</span>
              </div>
            </Tooltip>

            <Tooltip content="An isolated lapse in meeting ISO requirements that does not directly compromise the entire quality management system." position="top" className="full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'help' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#92400e' }}>Minor Non-Conformance</span>
                  <HelpCircle size={14} style={{ color: '#d97706', opacity: 0.7 }} />
                </div>
                <span style={{ fontWeight: 'bold', color: '#b45309', fontSize: '18px' }}>{minorNcCount}</span>
              </div>
            </Tooltip>

            <Tooltip content="A critical breakdown, total absence of a required procedure, or direct compliance risk requiring an immediate CAR." position="top" className="full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'help' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#991b1b' }}>Major Non-Conformance</span>
                  <HelpCircle size={14} style={{ color: '#dc2626', opacity: 0.7 }} />
                </div>
                <span style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '18px' }}>{majorNcCount}</span>
              </div>
            </Tooltip>
          </div>
        </div>

        <div className="metric-card metric-card--padded iso-action-center-card">
          <h3 className="metric-card-title iso-review-title iso-action-center-title"><AlertTriangle size={18} className="icon-amber" />Gaps Action Center</h3>
          <p className="iso-action-center-text">Review Minor NC and Major NC clauses from audits and generate CARs.</p>
          {nonCompliantFindings.length === 0 ? (
            <div className="iso-no-gaps">No active gaps found!</div>
          ) : (
            <div className="iso-findings-stack">
              {nonCompliantFindings.map((finding) => {
                const statusMeta = {
                  major_nc: { label: 'Major NC', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                  minor_nc: { label: 'Minor NC', bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
                }[finding.status] || { label: 'Finding', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' }
                const schedule = finding.audit_runs?.audit_schedules
                const findingNotes = (finding.notes || '').trim()
                const findingEvidence = (finding.evidence || '').trim()

                return (
                  <div key={finding.id} className="iso-finding-item">
                    <div className="iso-finding-info">
                      <div className="iso-finding-title-row">
                        <Tooltip content={`ISO Clause ${finding.iso_clauses?.clause_number || ''}: ${finding.iso_clauses?.title || 'Clause Standard'}`} position="top">
                          <span className="iso-finding-badge" style={{ cursor: 'help' }}>Clause {finding.iso_clauses?.clause_number || 'N/A'}</span>
                        </Tooltip>
                        <Tooltip content={statusMeta.label === 'Major NC' ? 'Major Non-Conformance: Critical breakdown, absent requirement, or high-risk compliance failure' : 'Minor Non-Conformance: Isolated lapse that does not directly compromise the system'} position="top">
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: statusMeta.bg,
                              color: statusMeta.color,
                              border: `1px solid ${statusMeta.border}`,
                              cursor: 'help'
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </Tooltip>
                        <strong className="iso-finding-title">{finding.iso_clauses?.title || 'Unknown Clause'}</strong>
                      </div>
                      {schedule?.title && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {schedule.title}{schedule.scheduled_date ? ` • ${schedule.scheduled_date}` : ''}
                        </div>
                      )}
                      <div style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        <strong style={{ color: '#475569' }}>Findings: </strong>
                        {findingNotes ? findingNotes : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No findings recorded.</span>}
                      </div>
                      {findingEvidence && (
                        <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                          <strong style={{ color: '#64748b' }}>Evidence: </strong>
                          {findingEvidence}
                        </div>
                      )}
                    </div>
                    <div>
                      {createdCars[finding.id] ? (
                        <div className="iso-car-generated"><CheckCircle2 size={14} />CAR Generated ({createdCars[finding.id]})</div>
                      ) : canManageIso ? (
                        <button type="button" onClick={() => handleOpenCarModal(finding)} className="btn-gradient-primary iso-btn-generate-car">Generate CAR</button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <ISOModulesModal {...modulesModalProps} />
      <ISOTaskSelectionModal {...taskSelectionModalProps} />
      <ISOTemplatesModal 
        isOpen={isTemplatesModalOpen} 
        onClose={closeTemplatesModal} 
        templates={templates} 
        loadingTemplates={loadingTemplates} 
        selectedTemplate={selectedTemplate} 
        setSelectedTemplate={setSelectedTemplate} 
      />
      <ISOSubTaskModal isOpen={isAuditTaskModalOpen} onClose={() => setIsAuditTaskModalOpen(false)} title="Internal Audit Task" canvasText="Task Configuration Workspace" onSubmit={() => handleTaskCreation("Internal Audit Task")} />
      <ISOSubTaskModal isOpen={isCapaTaskModalOpen} onClose={() => setIsCapaTaskModalOpen(false)} title="CAPA Task" canvasText="CAPA Task Configuration Canvas" onSubmit={() => handleTaskCreation("CAPA Task")} />
      <ISOSubTaskModal isOpen={isDocumentTaskModalOpen} onClose={() => setIsDocumentTaskModalOpen(false)} title="Document Update Task" canvasText="Document Update Workspace Canvas" onSubmit={() => handleTaskCreation("Document Update Task")} />
      <ISOSubTaskModal isOpen={isTrainingTaskModalOpen} onClose={() => setIsTrainingTaskModalOpen(false)} title="Training Task" canvasText="Training Program Configuration Canvas" onSubmit={() => handleTaskCreation("Training Task")} />
      <CARModal {...carModalProps} />
    </main>
  )
}
