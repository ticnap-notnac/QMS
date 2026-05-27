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
    <main className="dashboard" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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

      <div style={{ flex: '1', width: '95%', maxWidth: '1200px', margin: '32px auto', padding: '0 16px', boxSizing: 'border-box', position: 'relative', zIndex: '10', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={metricCardStyle}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>ISO Compliance:</span>
              <h2 style={{ margin: '8px 0 0 0', fontSize: '48px', fontWeight: '700', color: '#22d3ee', lineHeight: '1' }}>85%</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button type="button" style={badgeActionStyle}>ISO Modules</button>
              <button type="button" style={badgeActionStyle}>ISO Requirements</button>
            </div>
          </div>
          <div style={metricCardStyle}><span style={{ fontSize: '13px', color: '#475569' }}>Compliance Analysis Graph Canvas</span></div>
        </div>

        <div style={{ ...metricCardStyle, padding: '28px 32px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>Review Clause Status:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ProgressRow label="Compliant" color="#10b981" width="85%" icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" color="#f59e0b" width="10%" icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" color="#ef4444" width="5%" icon={<HelpCircle size={14} />} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingBottom: '24px' }}>
          <button type="button" onClick={() => setIsSelectionModalOpen(true)} style={primaryButtonStyle}>Create ISO Tasks</button>
        </div>
      </div>

      {/* Choice Modal */}
      {isSelectionModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <button onClick={() => setIsSelectionModalOpen(false)} style={closeButtonStyle}><X size={18} /></button>
            <h3 style={modalTitleStyle}>Select ISO Action Task Type:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div style={taskCardStyle} onClick={openAuditTask}><ClipboardCheck size={22} style={{ color: '#22d3ee' }} /><span style={taskCardTextStyle}>Internal Audit Task</span></div>
              <div style={taskCardStyle} onClick={openCapaTask}><AlertTriangle size={22} style={{ color: '#f59e0b' }} /><span style={taskCardTextStyle}>CAPA Task</span></div>
              <div style={taskCardStyle} onClick={openDocumentTask}><FileText size={22} style={{ color: '#3b82f6' }} /><span style={taskCardTextStyle}>Document Update Task</span></div>
              <div style={taskCardStyle} onClick={openTrainingTask}><GraduationCap size={22} style={{ color: '#10b981' }} /><span style={taskCardTextStyle}>Training Task</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Action Task Sub-Modals */}
      {isAuditTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '800px' }}>
            <button onClick={() => setIsAuditTaskModalOpen(false)} style={closeButtonStyle}><X size={18} /></button>
            <h3 style={modalTitleStyle}>Internal Audit Task</h3>
            <div style={workspacePlaceholderStyle}><span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Task Configuration Workspace</span></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><button onClick={() => setIsAuditTaskModalOpen(false)} style={secondaryActionButtonStyle}>Create Task</button></div>
          </div>
        </div>
      )}

      {isCapaTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '800px' }}>
            <button onClick={() => setIsCapaTaskModalOpen(false)} style={closeButtonStyle}><X size={18} /></button>
            <h3 style={modalTitleStyle}>CAPA Task</h3>
            <div style={workspacePlaceholderStyle}><span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>CAPA Task Configuration Canvas</span></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><button onClick={() => setIsCapaTaskModalOpen(false)} style={secondaryActionButtonStyle}>Create Task</button></div>
          </div>
        </div>
      )}

      {isDocumentTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '800px' }}>
            <button onClick={() => setIsDocumentTaskModalOpen(false)} style={closeButtonStyle}><X size={18} /></button>
            <h3 style={modalTitleStyle}>Document Update Task</h3>
            <div style={workspacePlaceholderStyle}><span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Document Update Workspace Canvas</span></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><button onClick={() => setIsDocumentTaskModalOpen(false)} style={secondaryActionButtonStyle}>Create Task</button></div>
          </div>
        </div>
      )}

      {isTrainingTaskModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '800px' }}>
            <button onClick={() => setIsTrainingTaskModalOpen(false)} style={closeButtonStyle}><X size={18} /></button>
            <h3 style={modalTitleStyle}>Training Task</h3>
            <div style={workspacePlaceholderStyle}><span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Training Program Configuration Canvas</span></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><button onClick={() => setIsTrainingTaskModalOpen(false)} style={secondaryActionButtonStyle}>Create Task</button></div>
          </div>
        </div>
      )}
    </main>
  )
}

const ProgressRow = ({ label, color, width, icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '110px' }}><span style={{ color }}>{icon}</span><span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>{label}:</span></div>
    <div style={{ flex: '1', height: '24px', background: 'rgba(8, 18, 35, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}><div style={{ height: '100%', width, background: `linear-gradient(to right, ${color}, transparent)`, borderRadius: '5px' }} /></div>
  </div>
);

const metricCardStyle = { background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', borderRadius: '12px', padding: '20px 24px', textAlign: 'left', boxShadow: '0 15px 30px rgba(0,0,0,0.4)', boxSizing: 'border-box' };
const badgeActionStyle = { background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#cbd5e1', padding: '12px 14px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', textAlign: 'center' };
const primaryButtonStyle = { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', color: 'white', padding: '12px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)' };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: '1000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4, 9, 20, 0.8)', backdropFilter: 'blur(10px)' };
const modalCardStyle = { width: '90%', maxWidth: '680px', background: 'rgba(13, 26, 45, 0.95)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '40px 32px', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)', position: 'relative', boxSizing: 'border-box' };
const closeButtonStyle = { position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' };
const modalTitleStyle = { margin: '0 0 28px 0', fontSize: '16px', fontWeight: '600', color: '#f8fafc', textAlign: 'left' };
const taskCardStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', height: '110px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', cursor: 'pointer' };
const taskCardTextStyle = { fontSize: '13px', fontWeight: '500', color: '#e2e8f0' };
const workspacePlaceholderStyle = { width: '100%', height: '350px', background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' };
const secondaryActionButtonStyle = { background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#e2e8f0', padding: '10px 48px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' };

export default ISOPage;