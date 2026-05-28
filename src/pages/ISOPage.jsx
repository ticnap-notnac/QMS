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

      <div className="page-main iso-page-main">
        
        {/* 📐 TOP GRID ROW: Split-Pane compliance tracking card structure */}
        <div className="iso-top-grid">
          
          {/* Left Block Stack: Metrics & Sub-buttons */}
          <div className="iso-left-stack">
            <div className="metric-card iso-compliance-card">
              <span className="metric-subtext">ISO Compliance:</span>
              <h2 className="metric-value iso-compliance-value">85%</h2>
            </div>
            
            <div className="iso-button-grid">
              <button type="button" className="btn-metric-card iso-metric-button">ISO Modules</button>
              <button type="button" className="btn-metric-card iso-metric-button">ISO Requirements</button>
            </div>
          </div>

          {/* Right Block: Compliance Analysis Graph Canvas */}
          <div className="metric-card iso-graph-card">
            <span className="graph-placeholder-text iso-graph-placeholder-text">Compliance Analysis Graph Canvas</span>
          </div>

        </div>

        {/* 📊 BOTTOM WORKSPACE: Review Clause Progress Tracker panel container */}
        <div className="metric-card metric-card--padded iso-review-card">
          <h3 className="metric-card-title iso-review-title">Review Clause Status:</h3>
          <div className="iso-progress-stack">
            <ProgressRow label="Compliant" tone="success" widthClass="progress-w-85" icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" tone="warning" widthClass="progress-w-10" icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" tone="danger" widthClass="progress-w-5" icon={<HelpCircle size={14} />} />
          </div>
        </div>

        {/* 🚀 CTA FOOTER ROW: Float Create Action button exactly to the right hand edge */}
        <div className="iso-cta-row">
          <button type="button" onClick={() => setIsSelectionModalOpen(true)} className="btn-gradient-primary iso-cta-button">
            Create ISO Tasks
          </button>
        </div>
      </div>

      {/* Choice Modal */}
      {isSelectionModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            
            {/* Modal Top Navigation Header Bar */}
            <div className="iso-modal-header">
              <button 
                type="button" 
                onClick={() => setIsSelectionModalOpen(false)} 
                className="iso-modal-icon-button"
                title="Go back"
              >
                <span className="iso-back-arrow">←</span>
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsSelectionModalOpen(false)} 
                className="iso-modal-icon-button"
                title="Close window"
              >
                <X size={18} />
              </button>
            </div>

            {/* 2x2 Clean Task Item Grid Matrix */}
            <div className="iso-task-grid">
              <div className="iso-task-item-button" onClick={openAuditTask}>
                <ClipboardCheck size={20} className="icon-cyan iso-task-icon" />
                <span className="iso-task-item-text">Internal Audit Task</span>
              </div>
              
              <div className="iso-task-item-button" onClick={openCapaTask}>
                <AlertTriangle size={20} className="icon-amber iso-task-icon" />
                <span className="iso-task-item-text">CAPA Task</span>
              </div>
              
              <div className="iso-task-item-button" onClick={openDocumentTask}>
                <FileText size={20} className="icon-blue iso-task-icon" />
                <span className="iso-task-item-text">Document Update Task</span>
              </div>
              
              <div className="iso-task-item-button" onClick={openTrainingTask}>
                <GraduationCap size={20} className="icon-green iso-task-icon" />
                <span className="iso-task-item-text">Training Task</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Individual Action Task Sub-Modals */}
      {isAuditTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsAuditTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">Internal Audit Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">Task Configuration Workspace</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => setIsAuditTaskModalOpen(false)} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isCapaTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsCapaTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">CAPA Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">CAPA Task Configuration Canvas</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => setIsCapaTaskModalOpen(false)} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isDocumentTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsDocumentTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">Document Update Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">Document Update Workspace Canvas</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => setIsDocumentTaskModalOpen(false)} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isTrainingTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsTrainingTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">Training Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">Training Program Configuration Canvas</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => setIsTrainingTaskModalOpen(false)} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

/* 📊 HORIZONTAL PROGRESS ROWS: Synchronizes labels and layout bars across the canvas box */
const ProgressRow = ({ label, tone, widthClass, icon }) => (
  <div className="progress-row iso-progress-row">
    <div className="progress-label-container iso-progress-label-container">
      <span className={`progress-icon progress-icon-${tone} iso-progress-icon`}>{icon}</span>
      <span className="progress-label-text iso-progress-label-text">{label}:</span>
    </div>
    <div className="progress-bar-container iso-progress-bar-container">
      <div className={`progress-bar-fill progress-fill-${tone} ${widthClass} iso-progress-bar-fill`} />
    </div>
  </div>
);

export default ISOPage;