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
      <main className="dashboard page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="metric-card" style={{ maxWidth: '480px', width: '90%', textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '1px solid #e4e4e7', background: '#ffffff' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Access Denied</h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: 0 }}>You do not have permission to view the ISO Compliance panel.</p>
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

        <div className="metric-card metric-card--padded" style={{ margin: 0, padding: '32px' }}>
          <h3 className="metric-card-title iso-review-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px 0', color: '#0f172a' }}><AlertTriangle size={18} className="icon-amber" />Gaps Action Center</h3>
          <p style={{ color: '#475569', fontSize: '13.5px', margin: '0 0 20px 0', lineHeight: '1.6' }}>Review non-compliant clauses and generate CARs.</p>
          {nonCompliantFindings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '14px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>No active gaps found!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {nonCompliantFindings.map((finding) => (
                <div key={finding.id} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Clause {finding.iso_clauses?.clause_number || 'N/A'}</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{finding.iso_clauses?.title || 'Unknown Clause'}</strong>
                    </div>
                  </div>
                  <div>
                    {createdCars[finding.id] ? (
                      <div style={{ fontSize: '13px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} />CAR Generated ({createdCars[finding.id]})</div>
                    ) : (
                      <button type="button" onClick={() => handleOpenCarModal(finding)} className="btn-gradient-primary" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: 'none' }}>Generate CAR</button>
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