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
      <main className="page-container" style={{ width: '95%', maxWidth: '1050px', margin: '40px auto', padding: '0 16px', boxSizing: 'border-box' }}>
        <h1 className="page-heading" style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: '#ffffff' }}>User Information</h1>

        <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

        {error && <div className="user-info-error">{error}</div>}

        {/* 🔮 UNIFORM METRIC CANVAS CARD GLASS DESIGN */}
        <div className="settings-container" style={{ display: 'flex', gap: '32px', width: '100%', minHeight: '560px', background: 'rgba(13, 26, 45, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '32px', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(10px)' }}>
          
          {/* Sidebar Navigation */}
          <div className="settings-sidebar" style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="sidebar-button active">Overview Summary</button>
          </div>

          {/* Main Content Pane Area Canvas */}
          <div className="settings-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
            
            {/* User Details Section */}
            <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
              
              <div className="profile-header profile-header-strong" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px' }}>
                <div className="profile-avatar-large" style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#22d3ee', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700' }}>
                  {userProfile.first_name?.charAt(0) || 'U'}
                </div>
                <div className="profile-user-meta-stack">
                  <h3 className="user-info-name" style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '600', color: '#ffffff' }}>{userProfile.first_name} {userProfile.last_name}</h3>
                  <p className="glass-card-subtext" style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{userRole || 'employee'}</p>
                </div>
              </div>

              <div className="profile-fields" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="profile-field" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                  <span className="profile-field-label" style={{ width: '200px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</span>
                  <span className="profile-field-value" style={{ color: '#e2e8f0', fontSize: '14px' }}>{userProfile.user_name || '-'}</span>
                </div>
                <div className="profile-field" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                  <span className="profile-field-label" style={{ width: '200px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee Department</span>
                  <span className="profile-field-value" style={{ color: '#e2e8f0', fontSize: '14px' }}>IT Department</span>
                </div>
                <div className="profile-field" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                  <span className="profile-field-label" style={{ width: '200px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Position</span>
                  <span className="profile-field-value" style={{ color: '#e2e8f0', fontSize: '14px' }}>{userPosition || '-'}</span>
                </div>
                <div className="profile-field" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                  <span className="profile-field-label" style={{ width: '200px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</span>
                  <span className="profile-field-value" style={{ color: '#e2e8f0', fontSize: '14px' }}>{userProfile.email || '-'}</span>
                </div>
                <div className="profile-field" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                  <span className="profile-field-label" style={{ width: '200px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact No.</span>
                  <span className="profile-field-value" style={{ color: '#e2e8f0', fontSize: '14px' }}>{userProfile.contact_number || '-'}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}