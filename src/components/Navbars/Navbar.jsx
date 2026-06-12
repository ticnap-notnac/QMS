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
  setProfileTargetTab
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
          <div className="brand-logo-box"><span>Q</span></div>
          <div className="brand-text-stack">
            <span className="brand-text">QFlow</span>
          </div>
        </div>

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
        <div className="app-nav-bottom">
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

      {/* 2. TOP RIGHT HEADER BAR PANEL */}
      <div className="app-nav-right" ref={menuContainerRef}>
        {shouldShowNotifications ? (
          <button onClick={onToggleNotifications} className="nav-icon-button nav-bell-button" aria-label="Open notifications">
            <Bell size={18} />
            {unreadNotificationCount > 0 ? (
              <span className="nav-bell-badge">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            ) : null}
          </button>
        ) : null}

        <div onClick={onToggleMenu} className="app-user-trigger">
          <div className={`user-avatar ${normalizedRole === 'admin' ? 'admin' : 'default'}`} />
          <div className="nav-user-info">
            <span className="nav-user-name">{userName || 'Name of the User'}</span>
            <span className="nav-user-position">{userEmail || 'Position'}</span>
          </div>
        </div>

        {/* DROPDOWN USER MENU */}
        {isUserMenuOpen && (
          <div className="user-menu-dropdown">
            <button 
              onClick={() => { navigate('/settings/profile'); setProfileTargetTab('User Information'); onToggleMenu(); }} 
              className="user-menu-item"
            >
              User Information
            </button>
            <button 
              onClick={() => { navigate('/settings'); setProfileTargetTab('Settings'); onToggleMenu(); }} 
              className="user-menu-item"
            >
              Settings
            </button>
            {normalizedRole === 'admin' && (
              <button 
                onClick={() => { navigate('/admin'); onToggleMenu(); }} 
                className="user-menu-item admin"
              >
                Admin Panel
              </button>
            )}
            <button onClick={() => { onLogout(); onToggleMenu(); }} className="user-menu-item logout">
              Logout
            </button>
          </div>
        )}
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