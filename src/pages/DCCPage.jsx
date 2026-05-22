import { useState } from 'react'
import Navbar from '../components/Navbar.jsx' // 💡 Import the unified clean navbar component
import { 
  Folder, 
  FileText, 
  Search, 
  ArrowLeft
} from 'lucide-react'

export default function DCCPage({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  userRole,                 
  setIsAdminPanelOpen,      
  setIsAuditToolsOpen,
  setProfileTargetTab       
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const folderItems = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* --- CALLS THE UNIFIED, CLEAN REPOSITORIES NAVBAR --- */}
      <Navbar
        activePage={activePage}
        onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={onToggleMenu}
        onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={onToggleNotifications}
        userRole={userRole}
        setIsAdminPanelOpen={setIsAdminPanelOpen}
        setIsAuditToolsOpen={setIsAuditToolsOpen}
        setProfileTargetTab={setProfileTargetTab}
      />

      {/* --- CENTRAL MAIN CANVAS MATRIX --- */}
      <div style={{ flex: '1', width: '95%', maxWidth: '1200px', margin: '32px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative', zIndex: '10' }}>
        <div style={{ width: '100%', background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '12px', padding: '40px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)', boxSizing: 'border-box', minHeight: '520px' }}>
          
          {!selectedFolder ? (
            /* VIEW 1: ACTIVE ROOT DIRECTORY REPOSITORIES GRID */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto 40px auto', position: 'relative' }}>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents or folders..." style={searchBarFieldStyle} />
                <Search size={16} style={{ position: 'absolute', right: '16px', top: '12px', color: '#64748b' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '16px', marginBottom: '48px' }}>
                {folderItems.map((item) => (
                  <div key={item} onClick={() => setSelectedFolder(item)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <div style={folderSquareBlockStyle}><Folder size={22} style={{ fill: 'rgba(6, 182, 212, 0.1)' }} /></div>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#cbd5e1' }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={recentlyViewedHeadingStyle}>Recently Viewed</h3>
                <div style={recentDocumentFileCardStyle}>
                  <FileText size={18} style={{ color: '#10b981' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#f1f5f9' }}>Trainees Attendance</span>
                    <span style={{ fontSize: '10px', color: '#475569' }}>A/test/Trainees Attendance.xlsx</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: SUB-DIRECTORY EXPEDITED WORKFLOW VIEWS */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '48px', width: '100%' }}>
                <button onClick={() => setSelectedFolder(null)} style={circularBackLinkButtonStyle}><ArrowLeft size={18} /></button>
                <div style={{ flex: '1', maxWidth: '440px', position: 'relative' }}>
                  <input type="text" placeholder="Search documents..." style={searchBarFieldStyle} />
                  <Search size={16} style={{ position: 'absolute', right: '16px', top: '12px', color: '#64748b' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <div style={{ width: '80px', height: '80px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e' }}><FileText size={36} /></div>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#cbd5e1', maxWidth: '110px', textAlign: 'center' }}>Trainees Attendance.PDF</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', width: '160px' }}>
                  <button style={actionPanelItemButtonStyle}>Approved</button>
                  <button style={{ ...actionPanelItemButtonStyle, background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>Download PDF</button>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}

// Global visual layout parameter configurations
const searchBarFieldStyle = { width: '100%', height: '40px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '0 44px 0 20px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' };
const folderSquareBlockStyle = { width: '48px', height: '48px', background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' };
const recentlyViewedHeadingStyle = { margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.02em' };
const recentDocumentFileCardStyle = { display: 'inline-flex', alignItems: 'center', gap: '14px', background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '12px 20px', cursor: 'pointer', textAlign: 'left' };
const circularBackLinkButtonStyle = { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#cbd5e1', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const actionPanelItemButtonStyle = { width: '100%', height: '36px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', cursor: 'pointer' };