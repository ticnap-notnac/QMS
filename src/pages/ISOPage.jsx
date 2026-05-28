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

      <div className="page-main" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', boxSizing: 'border-box' }}>
        
        {/* 📐 TOP GRID ROW: Split-Pane compliance tracking card structure */}
        <div style={{ display: 'flex', gap: '24px', width: '100%', alignItems: 'stretch' }}>
          
          {/* Left Block Stack: Metrics & Sub-buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px', flexShrink: 0 }}>
            <div className="metric-card" style={{ margin: 0, padding: '24px' }}>
              <span className="metric-subtext">ISO Compliance:</span>
              <h2 className="metric-value" style={{ margin: '8px 0 0 0', fontSize: '48px', fontWeight: '700', color: '#22d3ee' }}>85%</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button type="button" className="btn-metric-card" style={{ cursor: 'pointer', padding: '12px 8px' }}>ISO Modules</button>
              <button type="button" className="btn-metric-card" style={{ cursor: 'pointer', padding: '12px 8px' }}>ISO Requirements</button>
            </div>
          </div>

          {/* Right Block: Compliance Analysis Graph Canvas */}
          <div className="metric-card" style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '170px' }}>
            <span className="graph-placeholder-text" style={{ color: '#64748b' }}>Compliance Analysis Graph Canvas</span>
          </div>

        </div>

        {/* 📊 BOTTOM WORKSPACE: Review Clause Progress Tracker panel container */}
        <div className="metric-card metric-card--padded" style={{ margin: 0, padding: '32px' }}>
          <h3 className="metric-card-title" style={{ margin: '0 0 24px 0', fontSize: '16px', letterSpacing: '0.5px' }}>Review Clause Status:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ProgressRow label="Compliant" tone="success" widthClass="progress-w-85" icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" tone="warning" widthClass="progress-w-10" icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" tone="danger" widthClass="progress-w-5" icon={<HelpCircle size={14} />} />
          </div>
        </div>

        {/* 🚀 CTA FOOTER ROW: Float Create Action button exactly to the right hand edge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '8px' }}>
          <button type="button" onClick={() => setIsSelectionModalOpen(true)} className="btn-gradient-primary" style={{ padding: '12px 24px', fontWeight: '600' }}>
            Create ISO Tasks
          </button>
        </div>
      </div>

      {/* Choice Modal */}
      {isSelectionModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            
            {/* Modal Top Navigation Header Bar */}
            <div style={modalHeaderBarStyle}>
              <button 
                type="button" 
                onClick={() => setIsSelectionModalOpen(false)} 
                style={modalIconButtonStyle}
                title="Go back"
              >
                <span style={{ fontSize: '20px', fontWeight: '300', lineHeight: 1 }}>←</span>
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsSelectionModalOpen(false)} 
                style={modalIconButtonStyle}
                title="Close window"
              >
                <X size={18} />
              </button>
            </div>

            {/* 2x2 Clean Task Item Grid Matrix */}
            <div style={taskGridMatrixStyle}>
              <div style={taskItemButtonStyle} onClick={openAuditTask}>
                <ClipboardCheck size={20} className="icon-cyan" style={{ marginBottom: '8px' }} />
                <span style={taskItemTextStyle}>Internal Audit Task</span>
              </div>
              
              <div style={taskItemButtonStyle} onClick={openCapaTask}>
                <AlertTriangle size={20} className="icon-amber" style={{ marginBottom: '8px' }} />
                <span style={taskItemTextStyle}>CAPA Task</span>
              </div>
              
              <div style={taskItemButtonStyle} onClick={openDocumentTask}>
                <FileText size={20} className="icon-blue" style={{ marginBottom: '8px' }} />
                <span style={taskItemTextStyle}>Document Update Task</span>
              </div>
              
              <div style={taskItemButtonStyle} onClick={openTrainingTask}>
                <GraduationCap size={20} className="icon-green" style={{ marginBottom: '8px' }} />
                <span style={taskItemTextStyle}>Training Task</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Individual Action Task Sub-Modals */}
      {isAuditTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <button onClick={() => setIsAuditTaskModalOpen(false)} style={modalCloseAbsoluteStyle} aria-label="Close window">
              <X size={18} />
            </button>
            <h3 style={subModalTitleStyle}>Internal Audit Task</h3>
            <div className="workspace-placeholder" style={subModalCanvasStyle}>
              <span className="placeholder-text" style={{ color: '#64748b', fontSize: '14px' }}>Task Configuration Workspace</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button onClick={() => setIsAuditTaskModalOpen(false)} className="btn-secondary-light" style={subModalSubmitButtonStyle}>
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isCapaTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <button onClick={() => setIsCapaTaskModalOpen(false)} style={modalCloseAbsoluteStyle} aria-label="Close window">
              <X size={18} />
            </button>
            <h3 style={subModalTitleStyle}>CAPA Task</h3>
            <div className="workspace-placeholder" style={subModalCanvasStyle}>
              <span className="placeholder-text" style={{ color: '#64748b', fontSize: '14px' }}>CAPA Task Configuration Canvas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button onClick={() => setIsCapaTaskModalOpen(false)} className="btn-secondary-light" style={subModalSubmitButtonStyle}>
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isDocumentTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <button onClick={() => setIsDocumentTaskModalOpen(false)} style={modalCloseAbsoluteStyle} aria-label="Close window">
              <X size={18} />
            </button>
            <h3 style={subModalTitleStyle}>Document Update Task</h3>
            <div className="workspace-placeholder" style={subModalCanvasStyle}>
              <span className="placeholder-text" style={{ color: '#64748b', fontSize: '14px' }}>Document Update Workspace Canvas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button onClick={() => setIsDocumentTaskModalOpen(false)} className="btn-secondary-light" style={subModalSubmitButtonStyle}>
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isTrainingTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <button onClick={() => setIsTrainingTaskModalOpen(false)} style={modalCloseAbsoluteStyle} aria-label="Close window">
              <X size={18} />
            </button>
            <h3 style={subModalTitleStyle}>Training Task</h3>
            <div className="workspace-placeholder" style={subModalCanvasStyle}>
              <span className="placeholder-text" style={{ color: '#64748b', fontSize: '14px' }}>Training Program Configuration Canvas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button onClick={() => setIsTrainingTaskModalOpen(false)} className="btn-secondary-light" style={subModalSubmitButtonStyle}>
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
  <div className="progress-row" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
    <div className="progress-label-container" style={{ display: 'flex', alignItems: 'center', width: '130px', flexShrink: 0, gap: '8px' }}>
      <span className={`progress-icon progress-icon-${tone}`} style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span className="progress-label-text" style={{ fontSize: '13px', fontWeight: '500' }}>{label}:</span>
    </div>
    <div className="progress-bar-container" style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
      <div className={`progress-bar-fill progress-fill-${tone} ${widthClass}`} style={{ height: '100%', borderRadius: '99px' }} />
    </div>
  </div>
);

/* --- Choice Modal Symmetrical Glass Layout presentation styles --- */
const modalOverlayStyle = {
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
};

const modalCardStyle = {
  position: 'relative',
  width: '100%',
  maxWidth: '680px',
  background: 'rgba(13, 26, 45, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
  borderRadius: '16px',
  padding: '24px 32px 40px 32px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const modalHeaderBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  paddingBottom: '12px'
};

const modalIconButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  backgroundColor: 'rgba(255, 255, 255, 0.02)'
};

const taskGridMatrixStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
  width: '100%'
};

const taskItemButtonStyle = {
  background: 'rgba(15, 23, 42, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  padding: '28px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  boxSizing: 'border-box'
};

const taskItemTextStyle = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#e2e8f0',
  letterSpacing: '0.3px',
  textAlign: 'center'
};

/* --- Sub-Modal Inner Element Typography and Structural Details --- */
const subModalTitleStyle = {
  margin: '0 0 4px 0',
  fontSize: '18px',
  fontWeight: '600',
  color: '#f8fafc',
  letterSpacing: '0.3px',
  textAlign: 'left'
};

const modalCloseAbsoluteStyle = {
  position: 'absolute',
  top: '24px',
  right: '24px',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  transition: 'all 0.2s ease'
};

const subModalCanvasStyle = {
  width: '100%',
  height: '280px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px dashed rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  background: 'rgba(15, 23, 42, 0.2)',
  boxSizing: 'border-box',
  margin: '8px 0'
};

const subModalSubmitButtonStyle = {
  padding: '10px 24px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  borderRadius: '6px',
  transition: 'all 0.2s ease'
};

export default ISOPage;