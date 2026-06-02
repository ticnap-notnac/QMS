import React from 'react'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import useUserInformationPageLogic from '@/hooks/useUserInformationPageLogic'
import ProfileCard from '@/components/ProfileCard'
import './PagesStyles.css'

export default function UserInformationPage(props) {
  const {
    activePage,
    onPageChange,
    isUserMenuOpen,
    onToggleMenu,
    onLogout,
    onToggleNotifications,
    isNotificationsOpen,
    userRole,
    userName,
    userPosition,
    authUserId,
    setProfileTargetTab,
    profileTargetTab = 'User Information',
  } = props

  const { userProfile, loading, error, activeTab, setActiveTab } =
    useUserInformationPageLogic({ authUserId, profileTargetTab })

  if (loading) {
    return (
      <div className="page-root">
        <div className="page-main-centered">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-root">
        <div className="page-main-centered">Error: {error}</div>
      </div>
    )
  }

  const profileProps = { userProfile, userRole, userPosition, activeTab, setActiveTab }

  return (
    <div className="page-root">
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
        setProfileTargetTab={setProfileTargetTab}
        currentUserId={props.currentUserId}
        unreadNotificationCount={props.unreadNotificationCount}
        canViewNotifications={props.canViewNotifications}
        onUnreadCountChange={props.onUnreadCountChange}
        onRefreshUnreadCount={props.onRefreshUnreadCount}
        onOpenReport={props.onOpenReport}
      />

      <main className="page-container user-info-page-container">
        <h1 className="page-heading user-info-page-title">User Information</h1>

        <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

        <div className="settings-container user-info-container--profile">
          <div className="settings-sidebar user-info-sidebar--profile">
            <button
              className={`sidebar-button ${activeTab === 'Overview Summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('Overview Summary')}
            >
              Overview Summary
            </button>
          </div>

          <div className="settings-main user-info-main--profile">
            <div className="settings-content user-info-content--profile">
              <ProfileCard {...profileProps} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}