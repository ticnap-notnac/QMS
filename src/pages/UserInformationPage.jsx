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

      {/* 📐 STANDARD UNIFORM SYSTEM CONTAINER */}
      <main className="page-container user-info-page-container">
        <h1 className="page-heading user-info-page-title">User Information</h1>

        <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

        {error && <div className="user-info-error">{error}</div>}

        {/* 🔮 UNIFORM METRIC CANVAS CARD GLASS DESIGN */}
        <div className="settings-container user-info-container--profile">
          
          {/* Sidebar Navigation */}
          <div className="settings-sidebar user-info-sidebar--profile">
            <button className="sidebar-button active">Overview Summary</button>
          </div>

          {/* Main Content Pane Area Canvas */}
          <div className="settings-main user-info-main--profile">
            
            {/* User Details Section */}
            <div className="settings-content user-info-content--profile">
              
              <div className="profile-header profile-header-strong user-info-header--profile">
                <div className="profile-avatar-large user-info-avatar--profile">
                  {userProfile.first_name?.charAt(0) || 'U'}
                </div>
                <div className="profile-user-meta-stack">
                  <h3 className="user-info-name user-info-name--profile">{userProfile.first_name} {userProfile.last_name}</h3>
                  <p className="glass-card-subtext user-info-role--profile">{userRole || 'employee'}</p>
                </div>
              </div>

              <div className="profile-fields user-info-fields--profile">
                <div className="profile-field user-info-field--profile">
                  <span className="profile-field-label user-info-field-label--profile">Username</span>
                  <span className="profile-field-value user-info-field-value--profile">{userProfile.user_name || '-'}</span>
                </div>
                <div className="profile-field user-info-field--profile">
                  <span className="profile-field-label user-info-field-label--profile">Employee Department</span>
                  <span className="profile-field-value user-info-field-value--profile">IT Department</span>
                </div>
                <div className="profile-field user-info-field--profile">
                  <span className="profile-field-label user-info-field-label--profile">Position</span>
                  <span className="profile-field-value user-info-field-value--profile">{userPosition || '-'}</span>
                </div>
                <div className="profile-field user-info-field--profile">
                  <span className="profile-field-label user-info-field-label--profile">Email Address</span>
                  <span className="profile-field-value user-info-field-value--profile">{userProfile.email || '-'}</span>
                </div>
                <div className="profile-field user-info-field--profile">
                  <span className="profile-field-label user-info-field-label--profile">Contact No.</span>
                  <span className="profile-field-value user-info-field-value--profile">{userProfile.contact_number || '-'}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}