import Navbar from '../components/Navbar.jsx'
import Dashboard from '../components/Dashboard.jsx'

function DashboardPage({
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
  setProfileTargetTab,
  currentUserId,
  unreadNotificationCount,
  canViewNotifications,
  onUnreadCountChange,
  onRefreshUnreadCount,
  onOpenReport,
}) {
  return (
    <main className="dashboard">
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
        currentUserId={currentUserId}
        unreadNotificationCount={unreadNotificationCount}
        canViewNotifications={canViewNotifications}
        onUnreadCountChange={onUnreadCountChange}
        onRefreshUnreadCount={onRefreshUnreadCount}
        onOpenReport={onOpenReport}
      />
      <Dashboard 
        activePage={activePage}
        onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={onToggleMenu}
        onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={onToggleNotifications}
      />
    </main>
  )
}

export default DashboardPage;