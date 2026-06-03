import Toast from '../components/UI/Toast.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import {
  ISOModulesModal,
  ISOTaskSelectionModal,
  ISOSubTaskModal
} from '../components/ISOPage/ISOModals.jsx'
import useISOLogic from '../hooks/useISOLogic'
import './ISOPage.css'

export default function ISOPage({ userRole, userName }) {
  const {
    toast,
    setToast,
    overallScore,
    fetchActiveModules,
    compliantPct,
    partialPct,
    gapPct,
    nonCompliantFindings,
    createdCars,
    handleOpenCarModal,
    setIsSelectionModalOpen,
    modulesModalProps,
    taskSelectionModalProps,
    carModalProps,
    isAuditTaskModalOpen,
    setIsAuditTaskModalOpen,
    isCapaTaskModalOpen,
    setIsCapaTaskModalOpen,
    isDocumentTaskModalOpen,
    setIsDocumentTaskModalOpen,
    isTrainingTaskModalOpen,
    setIsTrainingTaskModalOpen,
    handleTaskCreation
  } = useISOLogic({ userName })

  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const isAuthorized = normalizedRole === 'admin' || normalizedRole === 'auditor'

  if (!isAuthorized) {
    return (
      <main className="dashboard page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="metric-card" style={{ maxWidth: '480px', width: '90%', textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(15, 23, 42, 0.4)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>Access Denied</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
            You do not have permission to view the ISO Compliance panel. Only quality auditors and system administrators are authorized to access this section.
          </p>
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
              <button type="button" className="btn-metric-card iso-metric-button" onClick={() => setToast({ message: "Fetching audit regulatory clause checklists...", type: 'info' })}>ISO Requirements</button>
            </div>
          </div>
          <div className="metric-card iso-graph-card">
            <span className="graph-placeholder-text iso-graph-placeholder-text">Compliance Analysis Graph Canvas</span>
          </div>
        </div>

        <div className="metric-card metric-card--padded iso-review-card">
          <h3 className="metric-card-title iso-review-title">Review Clause Status:</h3>
          <div className="iso-progress-stack">
            <ProgressRow label="Compliant" tone="success" percent={compliantPct} icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" tone="warning" percent={partialPct} icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" tone="danger" percent={gapPct} icon={<HelpCircle size={14} />} />
          </div>
        </div>

        <div className="metric-card metric-card--padded" style={{ margin: 0, padding: '32px' }}>
          <h3 className="metric-card-title iso-review-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} className="icon-amber" />
            Gaps & Deficiencies Action Center
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '-12px', marginBottom: '20px', lineHeight: '1.4' }}>
            Review non-compliant clauses identified during audits and generate Corrective Action Requests (CAR) to resolve them.
          </p>
          
          {nonCompliantFindings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '14px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
              No active non-compliance gaps found. Great job!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {nonCompliantFindings.map((finding) => (
                <div key={finding.id} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Clause {finding.iso_clauses?.clause_number || 'N/A'}</span>
                      <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{finding.iso_clauses?.title || 'Unknown Clause'}</strong>
                    </div>
                    {finding.evidence && <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: '1.4' }}><span style={{ color: '#64748b', fontWeight: '500' }}>Evidence: </span>{finding.evidence}</p>}
                  </div>
                  <div>
                    {createdCars[finding.id] ? (
                      <div style={{ fontSize: '13px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} />CAR Generated ({createdCars[finding.id]})</div>
                    ) : (
                      <button type="button" onClick={() => handleOpenCarModal(finding)} className="btn-gradient-primary" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>Generate CAR</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="iso-cta-row">
          <button type="button" onClick={() => setIsSelectionModalOpen(true)} className="btn-gradient-primary iso-cta-button">Create ISO Tasks</button>
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

const ProgressRow = ({ label, tone, percent, icon }) => (
  <div className="progress-row iso-progress-row" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
    <div className="progress-label-container iso-progress-label-container" style={{ width: '130px', flexShrink: 0 }}>
      <span className={`progress-icon progress-icon-${tone} iso-progress-icon`}>{icon}</span>
      <span className="progress-label-text iso-progress-label-text">{label}:</span>
    </div>
    <div className="progress-bar-container iso-progress-bar-container" style={{ flex: 1 }}>
      <div className={`progress-bar-fill progress-fill-${tone} iso-progress-bar-fill`} style={{ width: `${percent}%`, height: '100%' }} />
    </div>
    <span style={{ fontSize: '13px', color: '#94a3b8', minWidth: '40px', textAlign: 'right' }}>{percent}%</span>
  </div>
)