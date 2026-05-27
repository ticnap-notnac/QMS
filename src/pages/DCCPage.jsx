import { useState } from 'react'
import Navbar from '../components/Navbar.jsx' // 💡 Import the unified clean navbar component
import { 
  Folder, 
  FileText, 
  Search, 
  ArrowLeft
} from 'lucide-react'
import './PagesStyles.css'

export default function DCCPage({
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const folderItems = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

  return (
    <div className="dcc-root">
      
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
        userName={userName}
        userPosition={userPosition}
        setIsAdminPanelOpen={setIsAdminPanelOpen}
        setIsAuditToolsOpen={setIsAuditToolsOpen}
        setProfileTargetTab={setProfileTargetTab}
      />

      {/* --- CENTRAL MAIN CANVAS MATRIX --- */}
      <div className="dcc-main-wrapper">
        <div className="glass-card-dcc">
          
          {!selectedFolder ? (
            /* VIEW 1: ACTIVE ROOT DIRECTORY REPOSITORIES GRID */
            <div className="flex-column">
              <div className="search-container-centered">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents or folders..." className="search-bar-field" />
                <Search size={16} className="search-icon-absolute" />
              </div>
              <div className="folder-grid">
                {folderItems.map((item) => (
                  <div key={item} onClick={() => setSelectedFolder(item)} className="folder-item">
                    <div className="folder-square-block"><Folder size={22} className="icon-fill-soft" /></div>
                    <span className="folder-item-label">{item}</span>
                  </div>
                ))}
              </div>
              <div className="text-left">
                <h3 className="recently-viewed-heading">Recently Viewed</h3>
                <div className="recent-document-card">
                  <FileText size={18} className="icon-green" />
                  <div className="col-gap-2">
                    <span className="recent-doc-title">Trainees Attendance</span>
                    <span className="recent-doc-sub">A/test/Trainees Attendance.xlsx</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: SUB-DIRECTORY EXPEDITED WORKFLOW VIEWS */
            <div className="flex-column full-height">
              <div className="top-row">
                <button onClick={() => setSelectedFolder(null)} className="back-button"><ArrowLeft size={18} /></button>
                <div className="search-container-centered">
                  <input type="text" placeholder="Search documents..." className="search-bar-field" />
                  <Search size={16} className="search-icon-absolute" />
                </div>
              </div>
              <div className="row-gap-40">
                <div className="doc-item">
                  <div className="doc-thumbnail"><FileText size={36} /></div>
                  <span className="doc-title">Trainees Attendance.PDF</span>
                </div>
                <div className="action-panel">
                  <button className="action-panel-button">Approved</button>
                  <button className="action-panel-button action-panel-button--accent">Download PDF</button>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}
