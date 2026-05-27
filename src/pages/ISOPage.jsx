import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { 
  X, 
  ClipboardCheck, 
  AlertTriangle, 
  FileText, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle
} from 'lucide-react'

function ISOPage({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  userRole,
  userName,
  userPosition,
  setIsAdminPanelOpen,      
  setIsAuditToolsOpen,
  setProfileTargetTab
}) {
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isAuditTaskModalOpen, setIsAuditTaskModalOpen] = useState(false);
  const [isCapaTaskModalOpen, setIsCapaTaskModalOpen] = useState(false);
  const [isDocumentTaskModalOpen, setIsDocumentTaskModalOpen] = useState(false);
  const [isTrainingTaskModalOpen, setIsTrainingTaskModalOpen] = useState(false);

  const openAuditTask = () => { setIsSelectionModalOpen(false); setIsAuditTaskModalOpen(true); };
  const openCapaTask = () => { setIsSelectionModalOpen(false); setIsCapaTaskModalOpen(true); };
  const openDocumentTask = () => { setIsSelectionModalOpen(false); setIsDocumentTaskModalOpen(true); };
  const openTrainingTask = () => { setIsSelectionModalOpen(false); setIsTrainingTaskModalOpen(true); };

  return (
    <main className="dashboard page-root">
      <Navbar
        activePage={activePage}
        onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={onToggleMenu}
        onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={onToggleNotifications}
        userRole={userRole}
        userName={userName}
        userPosition={userPosition}
        setIsAdminPanelOpen={setIsAdminPanelOpen}
        setIsAuditToolsOpen={setIsAuditToolsOpen}
        setProfileTargetTab={setProfileTargetTab}
      />

      <div className="page-main">
        <div className="grid-auto-stretch">
          <div className="flex-col-gap">
              <div className="metric-card">
              <span className="metric-subtext">ISO Compliance:</span>
              <h2 className="metric-value">85%</h2>
            </div>
            <div className="grid-2-equal">
              <button type="button" className="btn-metric-card">ISO Modules</button>
              <button type="button" className="btn-metric-card">ISO Requirements</button>
            </div>
          </div>
          <div className="metric-card"><span className="graph-placeholder-text">Compliance Analysis Graph Canvas</span></div>
        </div>

        <div className="metric-card metric-card--padded">
          <h3 className="metric-card-title">Review Clause Status:</h3>
          <div className="col-gap-20">
            <ProgressRow label="Compliant" tone="success" widthClass="progress-w-85" icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" tone="warning" widthClass="progress-w-10" icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" tone="danger" widthClass="progress-w-5" icon={<HelpCircle size={14} />} />
          </div>
        </div>

        <div className="flex-end-action">
          <button type="button" onClick={() => setIsSelectionModalOpen(true)} className="btn-gradient-primary">Create ISO Tasks</button>
        </div>
      </div>

      {/* Choice Modal */}
      {isSelectionModalOpen && (
        <div className="modal-overlay-iso">
          <div className="modal-card-iso">
            <button onClick={() => setIsSelectionModalOpen(false)} className="modal-close-button"><X size={18} /></button>
            <h3 className="modal-title">Select ISO Action Task Type:</h3>
            <div className="modal-task-grid">
              <div className="task-card" onClick={openAuditTask}><ClipboardCheck size={22} className="icon-cyan" /><span className="task-card-text">Internal Audit Task</span></div>
              <div className="task-card" onClick={openCapaTask}><AlertTriangle size={22} className="icon-amber" /><span className="task-card-text">CAPA Task</span></div>
              <div className="task-card" onClick={openDocumentTask}><FileText size={22} className="icon-blue" /><span className="task-card-text">Document Update Task</span></div>
              <div className="task-card" onClick={openTrainingTask}><GraduationCap size={22} className="icon-green" /><span className="task-card-text">Training Task</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Action Task Sub-Modals */}
      {isAuditTaskModalOpen && (
        <div className="modal-overlay-iso">
          <div className="modal-card-large">
            <button onClick={() => setIsAuditTaskModalOpen(false)} className="modal-close-button"><X size={18} /></button>
            <h3 className="modal-title">Internal Audit Task</h3>
            <div className="workspace-placeholder"><span className="placeholder-text">Task Configuration Workspace</span></div>
            <div className="center-row"><button onClick={() => setIsAuditTaskModalOpen(false)} className="btn-secondary-light">Create Task</button></div>
          </div>
        </div>
      )}

      {isCapaTaskModalOpen && (
        <div className="modal-overlay-iso">
          <div className="modal-card-large">
            <button onClick={() => setIsCapaTaskModalOpen(false)} className="modal-close-button"><X size={18} /></button>
            <h3 className="modal-title">CAPA Task</h3>
            <div className="workspace-placeholder"><span className="placeholder-text">CAPA Task Configuration Canvas</span></div>
            <div className="center-row"><button onClick={() => setIsCapaTaskModalOpen(false)} className="btn-secondary-light">Create Task</button></div>
          </div>
        </div>
      )}

      {isDocumentTaskModalOpen && (
        <div className="modal-overlay-iso">
          <div className="modal-card-large">
            <button onClick={() => setIsDocumentTaskModalOpen(false)} className="modal-close-button"><X size={18} /></button>
            <h3 className="modal-title">Document Update Task</h3>
            <div className="workspace-placeholder"><span className="placeholder-text">Document Update Workspace Canvas</span></div>
            <div className="center-row"><button onClick={() => setIsDocumentTaskModalOpen(false)} className="btn-secondary-light">Create Task</button></div>
          </div>
        </div>
      )}

      {isTrainingTaskModalOpen && (
        <div className="modal-overlay-iso">
          <div className="modal-card-large">
            <button onClick={() => setIsTrainingTaskModalOpen(false)} className="modal-close-button"><X size={18} /></button>
            <h3 className="modal-title">Training Task</h3>
            <div className="workspace-placeholder"><span className="placeholder-text">Training Program Configuration Canvas</span></div>
            <div className="center-row"><button onClick={() => setIsTrainingTaskModalOpen(false)} className="btn-secondary-light">Create Task</button></div>
          </div>
        </div>
      )}
    </main>
  )
}

const ProgressRow = ({ label, tone, widthClass, icon }) => (
  <div className="progress-row">
    <div className="progress-label-container"><span className={`progress-icon progress-icon-${tone}`}>{icon}</span><span className="progress-label-text">{label}:</span></div>
    <div className="progress-bar-container"><div className={`progress-bar-fill progress-fill-${tone} ${widthClass}`} /></div>
  </div>
);

export default ISOPage;