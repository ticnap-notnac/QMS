import Toast from '../components/UI/Toast.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import { AlertTriangle, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { ISOModulesModal, ISOTaskSelectionModal, ISOSubTaskModal } from '../components/ISOPage/ISOModals.jsx'
import useISOLogic from '../hooks/useISOLogic'
import { ProgressRow } from '../components/ISOPage/ProgressRow.jsx'
import './ISOPage.css'

export default function ISOPage({ userRole, userName }) {
  const {
    toast, setToast, overallScore, fetchActiveModules, compliantPct, partialPct, gapPct, nonCompliantFindings,
    createdCars, handleOpenCarModal, modulesModalProps, taskSelectionModalProps, carModalProps, isAuditTaskModalOpen,
    setIsAuditTaskModalOpen, isCapaTaskModalOpen, setIsCapaTaskModalOpen, isDocumentTaskModalOpen, setIsDocumentTaskModalOpen,
    isTrainingTaskModalOpen, setIsTrainingTaskModalOpen, handleTaskCreation
  } = useISOLogic({ userName })

  const isAuthorized = ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase())
  if (!isAuthorized) {
    return (
      <main className="dashboard page-root iso-denied-container">
        <div className="metric-card iso-denied-card">
          <h2 className="iso-denied-title">Access Denied</h2>
          <p className="iso-denied-text">You do not have permission to view the ISO Compliance panel.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard page-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-main iso-page-main">
        <div className="iso-top-grid">
          <div className="iso-left-stack">
            <div className="metric-card iso-compliance-card">
              <span className="metric-subtext">ISO Compliance:</span>
              <h2 className="metric-value iso-compliance-value">{overallScore}%</h2>
            </div>
            <div className="iso-button-grid">
              <button type="button" className="btn-metric-card iso-metric-button" onClick={fetchActiveModules}>ISO Modules</button>
              <button type="button" className="btn-metric-card iso-metric-button" onClick={() => setToast({ message: "Fetching checklists...", type: 'info' })}>ISO Requirements</button>
            </div>
          </div>
          <div className="metric-card iso-graph-card"><span className="graph-placeholder-text iso-graph-placeholder-text">Compliance Analysis Graph Canvas</span></div>
        </div>

        <div className="metric-card metric-card--padded iso-review-card">
          <h3 className="metric-card-title iso-review-title">Review Clause Status:</h3>
          <div className="iso-progress-stack">
            <ProgressRow label="Compliant" tone="success" percent={compliantPct} icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" tone="warning" percent={partialPct} icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" tone="danger" percent={gapPct} icon={<HelpCircle size={14} />} />
          </div>
        </div>

        <div className="metric-card metric-card--padded iso-action-center-card">
          <h3 className="metric-card-title iso-review-title iso-action-center-title"><AlertTriangle size={18} className="icon-amber" />Gaps Action Center</h3>
          <p className="iso-action-center-text">Review non-compliant clauses and generate CARs.</p>
          {nonCompliantFindings.length === 0 ? (
            <div className="iso-no-gaps">No active gaps found!</div>
          ) : (
            <div className="iso-findings-stack">
              {nonCompliantFindings.map((finding) => (
                <div key={finding.id} className="iso-finding-item">
                  <div className="iso-finding-info">
                    <div className="iso-finding-title-row">
                      <span className="iso-finding-badge">Clause {finding.iso_clauses?.clause_number || 'N/A'}</span>
                      <strong className="iso-finding-title">{finding.iso_clauses?.title || 'Unknown Clause'}</strong>
                    </div>
                  </div>
                  <div>
                    {createdCars[finding.id] ? (
                      <div className="iso-car-generated"><CheckCircle2 size={14} />CAR Generated ({createdCars[finding.id]})</div>
                    ) : (
                      <button type="button" onClick={() => handleOpenCarModal(finding)} className="btn-gradient-primary iso-btn-generate-car">Generate CAR</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ISOModulesModal {...modulesModalProps} />
      <ISOTaskSelectionModal {...taskSelectionModalProps} />
      <ISOSubTaskModal isOpen={isAuditTaskModalOpen} onClose={() => setIsAuditTaskModalOpen(false)} title="Internal Audit Task" canvasText="Task Configuration Workspace" onSubmit={() => handleTaskCreation("Internal Audit Task")} />
      <ISOSubTaskModal isOpen={isCapaTaskModalOpen} onClose={() => setIsCapaTaskModalOpen(false)} title="CAPA Task" canvasText="CAPA Task Configuration Canvas" onSubmit={() => handleTaskCreation("CAPA Task")} />
      <ISOSubTaskModal isOpen={isDocumentTaskModalOpen} onClose={() => setIsDocumentTaskModalOpen(false)} title="Document Update Task" canvasText="Document Update Workspace Canvas" onSubmit={() => handleTaskCreation("Document Update Task")} />
      <ISOSubTaskModal isOpen={isTrainingTaskModalOpen} onClose={() => setIsTrainingTaskModalOpen(false)} title="Training Task" canvasText="Training Program Configuration Canvas" onSubmit={() => handleTaskCreation("Training Task")} />
      <CARModal {...carModalProps} />
    </main>
  )
}