import { Bell } from 'lucide-react'
import NotificationsModal from './NotificationsModal.jsx'
import './components.css'

export default function Navbar({
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
  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const shouldShowNotifications = typeof canViewNotifications === 'boolean'
    ? canViewNotifications
    : true

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
      {/* Brand Logo Identity Section */}
      <div onClick={() => onPageChange('Dashboard')} className="app-navbar-brand">
        <div className="brand-logo-box"><span>Q</span></div>
        <div className="brand-text-stack">
          <span className="brand-text">QFlow</span>
          <span className="brand-sub">Quality Management System</span>
        </div>
      </div>

      {/* Main Center Navigation Tabs — Kept perfectly clean and unified */}
      <nav className="app-nav-center">
        <button onClick={() => onPageChange('Dashboard')} className={`nav-tab-button ${activePage === 'Dashboard' ? 'active' : ''}`}>Dashboard</button>
        <button onClick={() => onPageChange('Reports')} className={`nav-tab-button ${activePage === 'Reports' ? 'active' : ''}`}>Reports</button>
        <button onClick={() => onPageChange('ISO')} className={`nav-tab-button ${activePage === 'ISO' ? 'active' : ''}`}>ISO</button>
        <button onClick={() => onPageChange('DCC')} className={`nav-tab-button ${activePage === 'DCC' ? 'active' : ''}`}>DCC</button>
      </nav>

      {/* Per-page settings tabs are managed by page-specific components (SettingsNavbar) */}

      {/* Right Side Control Utility Items */}
      <div className="app-nav-right">
        {shouldShowNotifications ? (
          <button onClick={onToggleNotifications} className="nav-icon-button nav-bell-button" aria-label="Open notifications">
            <Bell size={18} />
            {unreadNotificationCount > 0 ? <span className="nav-bell-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span> : null}
          </button>
        ) : null}
        
        <div onClick={onToggleMenu} className="app-user-trigger">
          <div className="nav-user-info">
            <span className="nav-user-name">{userName || 'Name of the User'}</span>
            <span className="nav-user-position">{userPosition || 'Position'}</span>
          </div>
          <div className={`user-avatar ${normalizedRole === 'admin' ? 'admin' : 'default'}`} />
        </div>
      </div>

      {/* --- REPAIRED DROPDOWN INTERACTIVE ROUTING PANEL --- */}
      {isUserMenuOpen && (
        <div className="user-menu-dropdown">
          <button onClick={() => { onPageChange('Profile'); setProfileTargetTab('User Information'); }} className="user-menu-item">User Information</button>
          <button onClick={() => { onPageChange('Settings'); setProfileTargetTab('Settings'); }} className="user-menu-item">Settings</button>
          {normalizedRole === 'admin' && <button onClick={() => onPageChange('Admin Panel')} className="user-menu-item admin">Admin Panel</button>}
          <button onClick={onLogout} className="user-menu-item logout">Logout</button>
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

const dropdownItemStyle = { background: 'none', border: 'none', color: '#cbd5e1', padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: '500', cursor: 'pointer', borderRadius: '5px', width: '100%', transition: 'background 0.15s ease' };