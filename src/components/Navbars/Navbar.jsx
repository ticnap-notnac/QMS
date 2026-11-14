import { useEffect, useRef, useState } from 'react'
import { 
  Bell, 
  LayoutDashboard, 
  ClipboardList, 
  Award, 
  History, 
  Settings, 
  LogOut,
  User,
  Users,
  Shield,
  ClipboardCheck,
  HelpCircle
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import NotificationsModal from '../Modals/NotificationsModal.jsx'
import '../components.css'

import { isAdminRole } from '@/utils/roleUtils.js'

export default function Navbar({
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  onToggleHelp,
  userRole,
  userPermissions,
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
  const desktopMenuContainerRef = useRef(null)
  const mobileMenuContainerRef = useRef(null)
  const location = useLocation()
  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const shouldShowNotifications = typeof canViewNotifications === 'boolean'
    ? canViewNotifications
    : true

  const hasExplicitPages = Array.isArray(userPermissions?.pages)
  const pagesList = hasExplicitPages ? userPermissions.pages : []
  const rightsList = Array.isArray(userPermissions?.rights) ? userPermissions.rights : []
  const hasPageAccess = (pageKey) => isAdminRole(userRole) || (hasExplicitPages && pagesList.includes(pageKey))
  const canAccessAdminPanel =
    hasPageAccess('admin_panel') ||
    ['manage_users', 'manage_roles', 'manage_categories', 'manage_iso'].some((r) => rightsList.includes(r))

  const resolveAdminPanelLandingPath = () => {
    if (isAdminRole(userRole) || hasPageAccess('admin_panel') || rightsList.includes('manage_users')) return '/admin'
    if (rightsList.includes('manage_roles')) return '/settings/roles'
    if (rightsList.includes('manage_categories')) return '/settings/departments'
    if (rightsList.includes('manage_iso')) return '/settings/iso-standards'
    return '/admin'
  }

  // Close the user dropdown when a click lands outside the reference node bounds
  useEffect(() => {
    if (!isUserMenuOpen) return

    const handleClickOutside = (event) => {
      const isOutsideDesktop = desktopMenuContainerRef.current && !desktopMenuContainerRef.current.contains(event.target)
      const isOutsideMobile = mobileMenuContainerRef.current && !mobileMenuContainerRef.current.contains(event.target)
      
      // If the click is outside BOTH the desktop and mobile menu containers, close it
      if (isOutsideDesktop && isOutsideMobile) {
        onToggleMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen, onToggleMenu])

  const navTabsJSX = (isMobile) => (
    <>
      {hasPageAccess('dashboard') && (
        <button 
          onClick={() => navigate('/dashboard')} 
          className={`nav-tab-button ${location.pathname === '/' || location.pathname.startsWith('/dashboard') ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
        >
          <LayoutDashboard size={isMobile ? 24 : 18} />
          <span>Overview</span>
        </button>
      )}

      {hasPageAccess('reports') && (
        <button 
          onClick={() => navigate('/reports')} 
          className={`nav-tab-button ${location.pathname.startsWith('/reports') ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
        >
          <ClipboardList size={isMobile ? 24 : 18} />
          <span>Reports</span>
        </button>
      )}

      {hasPageAccess('iso') && (
        <button 
          onClick={() => navigate('/iso')} 
          className={`nav-tab-button ${location.pathname.startsWith('/iso') ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
        >
          <Award size={isMobile ? 24 : 18} />
          <span>ISO Standards</span>
        </button>
      )}

      {hasPageAccess('dcc') && (
        <button 
          onClick={() => navigate('/dcc')} 
          className={`nav-tab-button ${location.pathname.startsWith('/dcc') ? 'active' : ''} ${isMobile ? 'mobile-tab' : ''}`}
        >
          <History size={isMobile ? 24 : 18} />
          <span>Document Control Center</span>
        </button>
      )}
    </>
  )

  const userMenuDropdownJSX = (
    <div className="sidebar-user-menu-dropdown">
      <button 
        onClick={() => { navigate('/settings/profile'); setProfileTargetTab('User Information'); onToggleMenu(); }} 
        className="user-menu-item"
      >
        <User size={16} /> User Information
      </button>
      {hasPageAccess('audit_tools') && (
        <button 
          onClick={() => { navigate('/audit-tools'); onToggleMenu(); }} 
          className="user-menu-item admin"
        >
          <ClipboardCheck size={16} /> Audit Tools
        </button>
      )}
      {canAccessAdminPanel && (
        <button 
          onClick={() => { navigate(resolveAdminPanelLandingPath()); onToggleMenu(); }} 
          className="user-menu-item admin"
        >
          <Shield size={16} /> Admin Panel
        </button>
      )}

      {/* Settings and logout inside dropdown */}
      <button 
        onClick={() => { navigate('/settings'); setProfileTargetTab('Settings'); onToggleMenu(); }} 
        className="user-menu-item"
      >
        <Settings size={16} /> Settings
      </button>
      <button 
        onClick={() => { onLogout(); onToggleMenu(); }} 
        className="user-menu-item logout"
      >
        <LogOut size={16} /> Logout
      </button>
    </div>
  )

  const actionIconsJSX = (
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
        onClick={onToggleHelp} 
        className="nav-icon-link-button desktop-only" 
        title="Help & Documentation"
        aria-label="Help & Documentation"
      >
        <HelpCircle size={20} />
      </button>
    </div>
  )

  return (
    <>
      {/* 1. DESKTOP NAVBAR (Hidden on mobile) */}
      <header className="app-navbar desktop-only">
        <div className="app-navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div onClick={() => navigate('/dashboard')} className="app-navbar-brand">
              <img src="/resq_logo_navbar.png" alt="RESQ Logo" className="brand-logo-img" />
            </div>

            {userSiteName && (
              <div className="app-navbar-site-badge" title={`Active Site: ${userSiteName}`}>
                {userSiteName}
              </div>
            )}
          </div>

          <nav className="app-nav-center">
            {navTabsJSX(false)}
          </nav>

          <div className="app-nav-bottom" ref={desktopMenuContainerRef}>
            {actionIconsJSX}
            
            <div className="sidebar-vertical-separator" style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)', margin: '0 8px' }}></div>

            <div onClick={onToggleMenu} className="sidebar-user-card-trigger">
              <div className={`sidebar-user-avatar ${isAdminRole(userRole) ? 'admin' : 'default'}`}>
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={userName}>{userName || 'Name of the User'}</span>
                <span className="sidebar-user-position">{String(userRole || userPosition || 'Role').replace(/_/g, ' ')}</span>
              </div>
            </div>

            {isUserMenuOpen && userMenuDropdownJSX}
          </div>
        </div>
      </header>

      {/* 2. MOBILE TOP HEADER (Hidden on desktop) */}
      <header className="app-navbar-mobile-top mobile-only" ref={mobileMenuContainerRef}>
        <div onClick={() => navigate('/dashboard')} className="mobile-brand">
          <img src="/resq_logo_navbar.png" alt="RESQ Logo" className="brand-logo-img-mobile" />
        </div>
        
        <div className="mobile-top-actions">
          {actionIconsJSX}
          <div onClick={onToggleMenu} className="mobile-user-avatar-trigger">
            <div className={`sidebar-user-avatar ${isAdminRole(userRole) ? 'admin' : 'default'}`}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          {isUserMenuOpen && userMenuDropdownJSX}
        </div>
      </header>

      {/* 3. MOBILE BOTTOM NAV (Hidden on desktop) */}
      <nav className="app-navbar-mobile-bottom mobile-only">
        {navTabsJSX(true)}
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
