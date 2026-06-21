import { useEffect, useRef } from 'react'
import { 
  Bell, 
  LayoutDashboard, 
  ClipboardList, 
  Award, 
  History, 
  Settings, 
  LogOut 
} from 'lucide-react'
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
  userEmail,
  unreadNotificationCount = 0,
  canViewNotifications,
  currentUserId,
  onUnreadCountChange,
  onRefreshUnreadCount,
  onOpenReport,
  setProfileTargetTab,
  userSiteName
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const menuContainerRef = useRef(null)

  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const shouldShowNotifications = typeof canViewNotifications === 'boolean'
    ? canViewNotifications
    : true

  // Close the user dropdown when a click lands outside the reference node bounds
  useEffect(() => {
    if (!isUserMenuOpen) return

    const handleClickOutside = (event) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target)) {
        onToggleMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen, onToggleMenu])

  return (
    <header className="app-navbar">
      {/* 1. LEFT SIDEBAR CONTAINER */}
      <div className="app-navbar-inner">
        {/* Brand Logo Identity Section */}
        <div onClick={() => navigate('/')} className="app-navbar-brand">
          <img src="/qflow_logo_transparent.png" alt="QFlow Logo" className="brand-logo-img" />
        </div>

        {/* Site Badge — shows which site this user belongs to */}
        {userSiteName && (
          <div className="app-navbar-site-badge" title={`Active Site: ${userSiteName}`}>
            {userSiteName}
          </div>
        )}

        {/* Main Vertical Navigation Tabs */}
        <nav className="app-nav-center">
          <button 
            onClick={() => navigate('/')} 
            className={`nav-tab-button ${location.pathname === '/' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigate('/reports')} 
            className={`nav-tab-button ${location.pathname.startsWith('/reports') ? 'active' : ''}`}
          >
            <ClipboardList size={18} />
            <span>Reports</span>
          </button>

          {(normalizedRole === 'admin' || normalizedRole === 'auditor') && (
            <button 
              onClick={() => navigate('/iso')} 
              className={`nav-tab-button ${location.pathname.startsWith('/iso') ? 'active' : ''}`}
            >
              <Award size={18} />
              <span>ISO</span>
            </button>
          )}

          <button 
            onClick={() => navigate('/dcc')} 
            className={`nav-tab-button ${location.pathname.startsWith('/dcc') ? 'active' : ''}`}
          >
            <History size={18} />
            <span>DCC</span>
          </button>
        </nav>

        {/* Bottom Actions of Sidebar */}
        <div className="app-nav-bottom" ref={menuContainerRef}>
          {/* User Card */}
          <div onClick={onToggleMenu} className="sidebar-user-card-trigger">
            <div className={`sidebar-user-avatar ${normalizedRole === 'admin' ? 'admin' : 'default'}`}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={userName}>{userName || 'Name of the User'}</span>
              <span className="sidebar-user-position">{userPosition || 'Position'}</span>
            </div>
          </div>

          {/* DROPDOWN USER MENU (now positioned relative to the sidebar bottom) */}
          {isUserMenuOpen && (
            <div className="sidebar-user-menu-dropdown">
              <button 
                onClick={() => { navigate('/settings/profile'); setProfileTargetTab('User Information'); onToggleMenu(); }} 
                className="user-menu-item"
              >
                User Information
              </button>
              {normalizedRole === 'admin' && (
                <button 
                  onClick={() => { navigate('/admin'); onToggleMenu(); }} 
                  className="user-menu-item admin"
                >
                  Admin Panel
                </button>
              )}
            </div>
          )}

          {/* Actions Row */}
          <div className="sidebar-actions-row">
            {shouldShowNotifications && (
              <button 
                onClick={onToggleNotifications} 
                className="nav-icon-link-button nav-bell-button-sidebar" 
                aria-label="Open notifications"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadNotificationCount > 0 ? (
                  <span className="sidebar-bell-badge">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                ) : null}
              </button>
            )}
            
            <button 
              onClick={() => { navigate('/settings'); setProfileTargetTab('Settings'); }} 
              className="nav-icon-link-button" 
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
            
            <button 
              onClick={onLogout} 
              className="nav-icon-link-button logout" 
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
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