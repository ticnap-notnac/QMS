import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import './PagesStyles.css'

export default function UserInformationPage({
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
}) {
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    user_name: '',
    email: '',
    employee_no: '',
    contact_number: '',
  })
  const [activeTab, setActiveTab] = useState(profileTargetTab || 'User Information')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profileTargetTab) {
      setActiveTab(profileTargetTab)
    }
  }, [profileTargetTab])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const currentAuthId = authUserId || user?.id

        if (currentAuthId) {
          const { data, error } = await supabase
            .from('users')
            .select('first_name, last_name, user_name, email, employee_no, contact_number')
            .eq('auth_id', currentAuthId)
            .maybeSingle()

          if (error) {
            console.error('Error fetching user profile:', error)
            setError(error.message)
          } else if (data) {
            setUserProfile({
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              user_name: data.user_name || '',
              email: data.email || user.email,
              employee_no: data.employee_no || '',
              contact_number: data.contact_number || '',
            })
          } else {
            setUserProfile(prev => ({ ...prev, email: user?.email || prev.email }))
          }
        }
      } catch (err) {
        setError(err.message)
        console.error('Error fetching user profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [authUserId])

  if (loading) {
    return (
      <div className="page-root">
        <Navbar activePage={activePage} onPageChange={onPageChange} isUserMenuOpen={isUserMenuOpen} onToggleMenu={onToggleMenu} onLogout={onLogout} isNotificationsOpen={isNotificationsOpen} onToggleNotifications={onToggleNotifications} userRole={userRole} userName={userName} userPosition={userPosition} setProfileTargetTab={setProfileTargetTab} />
        <main className="page-main-centered">Loading...</main>
      </div>
    )
  }

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
      />

      {/* --- UNIFIED SYMMETRICAL BOUNDING BOX CANVAS --- */}
      <main className="page-main-wide">
        <h1 className="page-title">User Information</h1>

        {error && <div className="user-info-error">{error}</div>}

        <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

        {/* --- UNIFIED SIZE GLASSMORPHIC FRAME CONTAINER --- */}
        <div className="glass-card-rounded-bottom">
          
          {/* TAB 1: USER INFORMATION */}
          {(activeTab === 'User Information' || activePage === 'Profile' || activePage === 'User Information') && (
            <div className="two-column-row">
              <div className="settings-sidebar">
                <button className="sidebar-button active">Overview Summary</button>
              </div>

              <div className="main-info-panel">
                <div className="profile-header profile-header-strong">
                  <div className="profile-avatar-large">{userProfile.first_name?.charAt(0) || 'U'}</div>
                  <div className="profile-user-meta-stack">
                    <h3 className="user-info-name">{userProfile.first_name} {userProfile.last_name}</h3>
                    <p className="glass-card-subtext">{userProfile.user_name || 'employee'}</p>
                  </div>
                </div>

                <div className="profile-fields">
                  <div className="profile-field"><span className="profile-field-label">Username</span><span className="profile-field-value">{userProfile.user_name || '-'}</span></div>
                  <div className="profile-field"><span className="profile-field-label">Employee Department</span><span className="profile-field-value">IT Department</span></div>
                  <div className="profile-field"><span className="profile-field-label">Position</span><span className="profile-field-value">{userPosition || '-'}</span></div>
                  <div className="profile-field"><span className="profile-field-label">Email Address</span><span className="profile-field-value">{userProfile.email || '-'}</span></div>
                  <div className="profile-field"><span className="profile-field-label">Contact No.</span><span className="profile-field-value">{userProfile.contact_number || '-'}</span></div>
                </div>
              </div>
            </div>
          )}

        {/* Settings tab removed - Settings handled in separate SettingsPage component */}

        </div>
      </main>
    </div>
  )
}

// Inline style constants migrated to CSS (removed)