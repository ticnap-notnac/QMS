import { useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import NotificationsModal from '../Modals/NotificationsModal.jsx'
import '../components.css'

export default function Navbar({
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  userRole,
  userName,
  userPosition,
  unreadNotificationCount = 0,
  canViewNotifications,
  currentUserId,
  onUnreadCountChange,
  onRefreshUnreadCount,
  onOpenReport,
  setIsAdminPanelOpen,
  setIsAuditToolsOpen,
  setProfileTargetTab
}) {
  const navigate = useNavigate()
  const location = useLocation()

  /* 🎯 THE FIX: Create a structural bounding box reference around the menu grouping */
  const menuContainerRef = useRef(null)

  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const shouldShowNotifications = typeof canViewNotifications === 'boolean'
    ? canViewNotifications
    : true

  // Close the user dropdown when a click lands outside the reference node bounds
  useEffect(() => {
    if (!isUserMenuOpen) return // Save clock cycles if it's already hidden

    const handleClickOutside = (event) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target)) {
        // Since the parent manages state, call the toggle to snap it shut if it's open
        onToggleMenu()
      }
    }

    // Capture standard mouse clicks across the DOM layout canvas
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen, onToggleMenu])

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        {/* Brand Logo Identity Section */}
        <div onClick={() => navigate('/')} className="app-navbar-brand" style={{ cursor: 'pointer' }}>
          <div className="brand-logo-box"><span>Q</span></div>
          <div className="brand-text-stack">
            <span className="brand-text">QFlow</span>
            <span className="brand-sub">Quality Management System</span>
          </div>
        </div>

        {/* Main Center Navigation Tabs — Kept perfectly clean and unified */}
        <nav className="app-nav-center">
          <button onClick={() => navigate('/')} className={`nav-tab-button ${location.pathname === '/' ? 'active' : ''}`}>Dashboard</button>
          <button onClick={() => navigate('/reports')} className={`nav-tab-button ${location.pathname.startsWith('/reports') ? 'active' : ''}`}>Reports</button>
          {(normalizedRole === 'admin' || normalizedRole === 'auditor') && (
            <button onClick={() => navigate('/iso')} className={`nav-tab-button ${location.pathname.startsWith('/iso') ? 'active' : ''}`}>ISO</button>
          )}
          <button onClick={() => navigate('/dcc')} className={`nav-tab-button ${location.pathname.startsWith('/dcc') ? 'active' : ''}`}>DCC</button>
        </nav>

        {/* Right Side Control Utility Items */}
        {/* 📦 Wrap both the trigger badge and its dropdown with our layout ref container */}
        <div className="app-nav-right" ref={menuContainerRef}>
          {shouldShowNotifications ? (
            <button onClick={onToggleNotifications} className="nav-icon-button nav-bell-button" aria-label="Open notifications">
              <Bell size={18} />
              {unreadNotificationCount > 0 ? <span className="nav-bell-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span> : null}
            </button>
          ) : null}

          <div onClick={onToggleMenu} className="app-user-trigger" style={{ cursor: 'pointer' }}>
            <div className="nav-user-info">
              <span className="nav-user-name">{userName || 'Name of the User'}</span>
              <span className="nav-user-position">{userPosition || 'Position'}</span>
            </div>
            <div className={`user-avatar ${normalizedRole === 'admin' ? 'admin' : 'default'}`} />
          </div>

          {/* --- DROPDOWN INTERACTIVE PANEL (Nested neatly inside the bound container layout) --- */}
          {isUserMenuOpen && (
            <div className="user-menu-dropdown">
              <button onClick={() => { navigate('/settings/profile'); setProfileTargetTab('User Information'); onToggleMenu(); }} className="user-menu-item">User Information</button>
              <button onClick={() => { navigate('/settings'); setProfileTargetTab('Settings'); onToggleMenu(); }} className="user-menu-item">Settings</button>
              {normalizedRole === 'admin' && <button onClick={() => { navigate('/admin'); onToggleMenu(); }} className="user-menu-item admin">Admin Panel</button>}
              <button onClick={() => { onLogout(); onToggleMenu(); }} className="user-menu-item logout">Logout</button>
            </div>
          )}
        </div>
      </div>

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={onToggleNotifications}
        currentUserId={currentUserId}
        onUnreadCountChange={onUnreadCountChange}
        onRefreshUnreadCount={onRefreshUnreadCount}
        onOpenReport={onOpenReport}
      />
    </header>
  )
}

const dropdownItemStyle = { background: 'none', border: 'none', color: '#cbd5e1', padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: '500', cursor: 'pointer', borderRadius: '5px', width: '100%', transition: 'background 0.15s ease' };