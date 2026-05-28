import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar.jsx' // 💡 Import the unified clean navbar component
import { 
  Folder, 
  FileText, 
  Search, 
  ArrowLeft
} from 'lucide-react'
import './PagesStyles.css'
import SystemLogsPanel from '../components/SystemLogsPanel.jsx'

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
  const folderItems = [
    { id: 'system_logs', label: 'System Logs' },
  ]

  const [recentlyViewed, setRecentlyViewed] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dcc_recently_viewed')
      if (raw) setRecentlyViewed(JSON.parse(raw))
    } catch (e) {
      // ignore
    }
  }, [])

  function saveRecentlyViewed(list) {
    try {
      localStorage.setItem('dcc_recently_viewed', JSON.stringify(list))
    } catch (e) {}
  }

  function addRecentlyViewed(item) {
    const entry = { id: item.id, label: item.label, path: item.path || null, when: new Date().toISOString() }
    setRecentlyViewed((prev) => {
      const deduped = [entry].concat(prev.filter((p) => p.id !== entry.id)).slice(0, 10)
      saveRecentlyViewed(deduped)
      return deduped
    })
  }

  function openFolder(item) {
    setSelectedFolder(item)
    addRecentlyViewed(item)
  }

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
                  <div key={item.id} onClick={() => openFolder(item)} className="folder-item">
                    <div className="folder-square-block"><Folder size={22} className="icon-fill-soft" /></div>
                    <span className="folder-item-label">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="text-left">
                <h3 className="recently-viewed-heading">Recently Viewed</h3>
                {recentlyViewed.length === 0 ? (
                  <div className="recent-empty">No recently viewed items.</div>
                ) : (
                  recentlyViewed.map(rv => (
                    <div key={rv.id} className="recent-document-card dcc-recent-document-card" onClick={() => openFolder({ id: rv.id, label: rv.label })}>
                      <FileText size={18} className="icon-green" />
                      <div className="col-gap-2">
                        <span className="recent-doc-title">{rv.label}</span>
                        <span className="recent-doc-sub">{new Date(rv.when).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            ) : (
              /* VIEW 2: SUB-DIRECTORY / FOLDER VIEW */
              <div className="flex-column full-height">
                <div className="top-row">
                  <button onClick={() => setSelectedFolder(null)} className="back-button"><ArrowLeft size={18} /></button>
                  <div className="search-container-centered">
                    <input type="text" placeholder={`Search ${selectedFolder.label}...`} className="search-bar-field" />
                    <Search size={16} className="search-icon-absolute" />
                  </div>
                </div>

                {/* If the selected folder is System Logs and user is admin, show logs panel */}
                {selectedFolder.id === 'system_logs' ? (
                  userRole === 'admin' ? (
                    <div className="row-gap-40">
                      <div className="glass-card-dcc system-logs-wrapper">
                        <SystemLogsPanel onClose={() => setSelectedFolder(null)} />
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">You do not have permission to view System Logs.</div>
                  )
                ) : (
                  /* generic folder: no hardcoded documents */
                  <div className="row-gap-40">
                    <div className="empty-state">This folder is empty or has no preview. Use the search or upload documents.</div>
                  </div>
                )}
              </div>
            )}
          
        </div>
      </div>
    </div>
  )
}
