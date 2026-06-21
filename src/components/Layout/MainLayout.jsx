import Navbar from '@/components/Navbars/Navbar.jsx'
import AppRouter from '@/routes/AppRouter.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'

export default function MainLayout({
  isUserMenuOpen,
  setIsUserMenuOpen,
  handleLogout,
  isNotificationsOpen,
  setIsNotificationsOpen,
  userRole,
  userName,
  userPosition,
  userEmail,
  currentUserId,
  unreadNotificationCount,
  canViewNotifications,
  setUnreadNotificationCount,
  refreshUnreadNotificationCount,
  handleNotificationSelect,
  setProfileTargetTab,
  userSiteName,
  sharedProps,
  refreshUserData
}) {
  return (
    <>
      <Navbar
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={() => setIsUserMenuOpen((open) => !open)}
        onLogout={handleLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={() => setIsNotificationsOpen((open) => !open)}
        userRole={userRole}
        userName={userName}
        userPosition={userPosition}
        userEmail={userEmail}
        currentUserId={currentUserId}
        unreadNotificationCount={unreadNotificationCount}
        canViewNotifications={canViewNotifications}
        onUnreadCountChange={setUnreadNotificationCount}
        onRefreshUnreadCount={refreshUnreadNotificationCount}
        onOpenReport={handleNotificationSelect}
        setProfileTargetTab={setProfileTargetTab}
        userSiteName={userSiteName}
      />
      <ErrorBoundary>
        <AppRouter sharedProps={sharedProps} refreshUserData={refreshUserData} />
      </ErrorBoundary>
    </>
  )
}
