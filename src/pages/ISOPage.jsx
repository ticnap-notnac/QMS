import Toast from '../components/UI/Toast.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import { AlertTriangle, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ISOModulesModal, ISOTaskSelectionModal, ISOSubTaskModal, ISOTemplatesModal } from '../components/ISOPage/ISOModals.jsx'
import useISOLogic from '../hooks/useISOLogic'
import { ProgressRow } from '../components/ISOPage/ProgressRow.jsx'
import './ISOPage.css'

import { isAdminRole } from '@/utils/roleUtils.js'

export default function ISOPage({ userRole, userPermissions, userName }) {
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>ISO Compliance Overview</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Monitor your quality management metrics and findings.</p>
            </div>
            {canManageIso && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-metric-card" style={{ background: '#090d16', color: '#fff' }} onClick={fetchActiveModules}>ISO Modules</button>
                <button type="button" className="btn-metric-card" style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }} onClick={fetchAndOpenTemplates}>ISO Templates</button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div className="metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderTop: '4px solid #16a34a' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>COMPLIANT CLAUSES</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#16a34a', marginTop: '8px' }}>{compliantCount}</div>
            </div>
            
            <div className="metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderTop: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL FINDINGS</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b', marginTop: '8px' }}>{totalFindings}</div>
            </div>

            <div className="metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderTop: '4px solid #dc2626' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>NON-COMPLIANT</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#dc2626', marginTop: '8px' }}>{majorNcCount + minorNcCount}</div>
            </div>
          </div>
        </div>

        <div className="metric-card metric-card--padded iso-review-card" style={{ padding: '24px', height: 'auto', minHeight: 'max-content' }}>
          <h3 className="metric-card-title iso-review-title" style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Review Clause Status</h3>
          <div className="iso-progress-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', color: '#166534' }}>Compliant</span>
              <span style={{ fontWeight: 'bold', color: '#15803d', fontSize: '18px' }}>{compliantCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', color: '#1e40af' }}>Opportunity for Improvement (OFI)</span>
              <span style={{ fontWeight: 'bold', color: '#1d4ed8', fontSize: '18px' }}>{ofiCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', color: '#92400e' }}>Minor Non-Conformance</span>
              <span style={{ fontWeight: 'bold', color: '#b45309', fontSize: '18px' }}>{minorNcCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', color: '#991b1b' }}>Major Non-Conformance</span>
              <span style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '18px' }}>{majorNcCount}</span>
            </div>
          </div>
        </div>

        <div className="metric-card metric-card--padded iso-action-center-card">
          <h3 className="metric-card-title iso-review-title iso-action-center-title"><AlertTriangle size={18} className="icon-amber" />Gaps Action Center</h3>
          <p className="iso-action-center-text">Review non-compliant clauses and generate CARs.</p>
          {nonCompliantFindings.length === 0 ? (
            <div className="iso-no-gaps">No active gaps found!</div>
          ) : (
            <div className="iso-findings-stack">
              {nonCompliantFindings.map((finding) => {
                const statusMeta = {
                  major_nc: { label: 'Major NC', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                  minor_nc: { label: 'Minor NC', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
                  ofi: { label: 'OFI', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
                }[finding.status] || { label: 'Finding', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' }
                const schedule = finding.audit_runs?.audit_schedules

                return (
                  <div key={finding.id} className="iso-finding-item">
                    <div className="iso-finding-info">
                      <div className="iso-finding-title-row">
                        <span className="iso-finding-badge">Clause {finding.iso_clauses?.clause_number || 'N/A'}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: statusMeta.bg,
                            color: statusMeta.color,
                            border: `1px solid ${statusMeta.border}`
                          }}
                        >
                          {statusMeta.label}
                        </span>
                        <strong className="iso-finding-title">{finding.iso_clauses?.title || 'Unknown Clause'}</strong>
                      </div>
                      {schedule?.title && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {schedule.title}{schedule.scheduled_date ? ` • ${schedule.scheduled_date}` : ''}
                        </div>
                      )}
                      {finding.requirement && (
                        <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>
                          {finding.requirement}
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
