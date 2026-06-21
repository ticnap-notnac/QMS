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

  const NavTabs = ({ isMobile }) => (
    <>
      <button 
        onClick={() => navigate('/')} 
        className={`nav-tab-button ${location.pathname === '/' ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
      >
        <LayoutDashboard size={isMobile ? 24 : 18} />
        <span>Dashboard</span>
      </button>
      
      <button 
        onClick={() => navigate('/reports')} 
        className={`nav-tab-button ${location.pathname.startsWith('/reports') ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
      >
        <ClipboardList size={isMobile ? 24 : 18} />
        <span>Reports</span>
      </button>

      {(normalizedRole === 'admin' || normalizedRole === 'auditor') && (
        <button 
          onClick={() => navigate('/iso')} 
          className={`nav-tab-button ${location.pathname.startsWith('/iso') ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
        >
          <Award size={isMobile ? 24 : 18} />
          <span>ISO</span>
        </button>
      )}

      <button 
        onClick={() => navigate('/dcc')} 
        className={`nav-tab-button ${location.pathname.startsWith('/dcc') ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
      >
        <History size={isMobile ? 24 : 18} />
        <span>DCC</span>
      </button>
    </>
  )

  const UserMenuDropdown = () => (
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

      {/* Mobile-only settings and logout inside dropdown */}
      <button 
        onClick={() => { navigate('/settings'); setProfileTargetTab('Settings'); onToggleMenu(); }} 
        className="user-menu-item mobile-only"
      >
        Settings
      </button>
      <button 
        onClick={() => { onLogout(); onToggleMenu(); }} 
        className="user-menu-item mobile-only"
        style={{ color: '#fca5a5' }}
      >
        Logout
      </button>
    </div>
  )

  const ActionIcons = () => (
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
        className="nav-icon-link-button desktop-only" 
        title="Settings"
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>
      
      <button 
        onClick={onLogout} 
        className="nav-icon-link-button logout desktop-only" 
        title="Logout"
        aria-label="Logout"
      >
        <LogOut size={20} />
      </button>
    </div>
  )

  return (
    <>
      {/* 1. DESKTOP NAVBAR (Hidden on mobile) */}
      <header className="app-navbar desktop-only">
        <div className="app-navbar-inner">
          <div onClick={() => navigate('/')} className="app-navbar-brand">
            <img src="/qflow_logo_transparent.png" alt="QFlow Logo" className="brand-logo-img" />
          </div>

          {userSiteName && (
            <div className="app-navbar-site-badge" title={`Active Site: ${userSiteName}`}>
              {userSiteName}
            </div>
          )}

          <nav className="app-nav-center">
            <NavTabs isMobile={false} />
          </nav>

          <div className="app-nav-bottom" ref={menuContainerRef}>
            <div onClick={onToggleMenu} className="sidebar-user-card-trigger">
              <div className={`sidebar-user-avatar ${normalizedRole === 'admin' ? 'admin' : 'default'}`}>
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={userName}>{userName || 'Name of the User'}</span>
                <span className="sidebar-user-position">{userPosition || 'Position'}</span>
              </div>
            </div>

            {isUserMenuOpen && <UserMenuDropdown />}

            <ActionIcons />
          </div>
        </div>
      </header>

      {/* 2. MOBILE TOP HEADER (Hidden on desktop) */}
      <header className="app-navbar-mobile-top mobile-only" ref={menuContainerRef}>
        <div onClick={() => navigate('/')} className="mobile-brand">
          <img src="/qflow_logo_transparent.png" alt="QFlow Logo" className="brand-logo-img-mobile" />
        </div>
        
        <div className="mobile-top-actions">
          <ActionIcons />
          <div onClick={onToggleMenu} className="mobile-user-avatar-trigger">
            <div className={`sidebar-user-avatar ${normalizedRole === 'admin' ? 'admin' : 'default'}`}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          {isUserMenuOpen && <UserMenuDropdown />}
        </div>
      </header>

      {/* 3. MOBILE BOTTOM NAV (Hidden on desktop) */}
      <nav className="app-navbar-mobile-bottom mobile-only">
        <NavTabs isMobile={true} />
      </nav>

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={onToggleNotifications}
        currentUserId={currentUserId}
        onUnreadCountChange={onUnreadCountChange}
        onRefreshUnreadCount={onRefreshUnreadCount}
        onOpenReport={onOpenReport}
      />
    </>
  )
}