import React from 'react'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import Toast from '@/components/Toast'
import useSettingsPageLogic from '@/hooks/useSettingsPageLogic'
import SettingsProfileForm from '@/components/SettingsProfileForm'
import PasswordSection from '@/components/PasswordSection'
import './SettingsPage.css'

export default function SettingsPage(props) {
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
    onProfileUpdate,
    currentUserId,
    unreadNotificationCount,
    canViewNotifications,
    onUnreadCountChange,
    onRefreshUnreadCount,
    onOpenReport,
  } = props

  const {
    userProfile,
    setUserProfile,
    activeSection,
    setActiveSection,
    loading,
    toast,
    setToast,
    saving,
    passwords,
    setPasswords,
    handleUpdateChanges,
  } = useSettingsPageLogic({ authUserId, onProfileUpdate })

  if (loading) {
    return (
      <>
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
        />
        <main className="page-padding">Loading...</main>
      </>
    )
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
        currentUserId={currentUserId}
        unreadNotificationCount={unreadNotificationCount}
        canViewNotifications={canViewNotifications}
        onUnreadCountChange={onUnreadCountChange}
        onRefreshUnreadCount={onRefreshUnreadCount}
        onOpenReport={onOpenReport}
      />

      <main className="page-container settings-page-container">
        <h1 className="page-heading settings-page-title">Settings</h1>

        <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

        <div className="settings-container settings-container--profile">
          <div className="settings-sidebar settings-sidebar--profile">
            <button onClick={() => setActiveSection('Profile & Account')} className={`sidebar-button ${activeSection === 'Profile & Account' ? 'active' : ''}`}>
              Profile & Account
            </button>
            <button onClick={() => setActiveSection('Reporting Defaults')} className={`sidebar-button ${activeSection === 'Reporting Defaults' ? 'active' : ''}`}>
              Reporting Defaults
            </button>
            {userRole === 'admin' && (
              <button onClick={() => setActiveSection('Audit Tools')} className={`sidebar-button ${activeSection === 'Audit Tools' ? 'active' : ''}`}>
                Audit Tools
              </button>
            )}
          </div>

          <div className="settings-main settings-main--profile">
            {activeSection === 'Profile & Account' && (
              <div className="settings-content settings-content--profile">
                <SettingsProfileForm {...{ userProfile, setUserProfile }} />
                <PasswordSection {...{ passwords, setPasswords }} />
                <button className="btn-primary mt-24 settings-save-button" onClick={handleUpdateChanges} disabled={saving}>
                  {saving ? 'Saving...' : 'Update Changes'}
                </button>
              </div>
            )}

            {activeSection === 'Reporting Defaults' && (
              <div className="settings-content settings-content--profile">
                <h2 className="settings-section-title">Reporting Defaults</h2>
                <div className="settings-placeholder">
                  <p className="settings-placeholder-text">Reporting preferences will be configured here.</p>
                </div>
              </div>
            )}

            {activeSection === 'Audit Tools' && userRole === 'admin' && (
              <div className="settings-content settings-content--profile">
                <h2 className="settings-section-title">Audit Tools</h2>
                <div className="settings-placeholder">
                  <p className="settings-placeholder-text">Audit tools and utilities will be available here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}