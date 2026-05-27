import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Navbar from '@/components/Navbar'
import { Settings, User } from 'lucide-react'
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

  // Update active tab when profileTargetTab prop changes
  useEffect(() => {
    if (profileTargetTab) {
      setActiveTab(profileTargetTab)
    }
  }, [profileTargetTab])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('first_name, last_name, user_name, email, employee_no, contact_number')
            .eq('email', user.email)
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
            // No data found, use auth email
            setUserProfile(prev => ({
              ...prev,
              email: user.email
            }))
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
  }, [])

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
        <main style={{ padding: '24px' }}>Loading...</main>
      </>
    )
  }

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

      <main style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px', color: '#e2e8f0' }}>Profile Settings</h1>

        {error && (
          <div className="user-info-error">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="user-info-tabs">
          <button
            onClick={() => setActiveTab('User Information')}
            className={`user-info-tab-button ${activeTab === 'User Information' ? 'active' : ''}`}
          >
            <User size={18} />
            User Information
          </button>

          <button
            onClick={() => setActiveTab('Settings')}
            className={`user-info-tab-button ${activeTab === 'Settings' ? 'active' : ''}`}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>

        {/* User Information Tab */}
        {activeTab === 'User Information' && (
          <div className="user-info-card">
            {/* Header with Avatar */}
            <div className="user-info-header">
              <div className="user-avatar">
                <span className="user-avatar-initial">{userProfile.first_name?.charAt(0) || 'U'}</span>
              </div>
              <div className="user-info-name">
                <h3>{userProfile.first_name} {userProfile.last_name}</h3>
                <p>{userProfile.user_name}</p>
              </div>
            </div>

            {/* Profile Fields List */}
            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field-label">Username</span>
                <span className="profile-field-value">{userProfile.user_name || '-'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Employee Department</span>
                <span className="profile-field-value">IT Department</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Position</span>
                <span className="profile-field-value">{userPosition || '-'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Email Address</span>
                <span className="profile-field-value">{userProfile.email || '-'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Contact No.</span>
                <span className="profile-field-value">{userProfile.contact_number || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'Settings' && (
          <div className="settings-tab-content">
            {/* Sidebar */}
            <div className="settings-sidebar">
              <button className="sidebar-button active">
                Profile & Account
              </button>
              <button className="sidebar-button">
                Reporting Defaults
              </button>
              <button className="sidebar-button">
                Audit Tools
              </button>
            </div>

            {/* Content Area */}
            <div className="settings-main-content">
              <div className="settings-content-inner">
                <h2>Edit Profile</h2>
                
                <div style={{ marginBottom: '24px' }}>
                  <div className="edit-profile-grid-3col">
                    <div className="form-group">
                      <label>First Name</label>
                      <input 
                        type="text" 
                        value={userProfile.first_name} 
                        onChange={(e) => setUserProfile({...userProfile, first_name: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input 
                        type="text" 
                        placeholder="N/A"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input 
                        type="text" 
                        value={userProfile.last_name}
                        onChange={(e) => setUserProfile({...userProfile, last_name: e.target.value})}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="edit-profile-grid-2col">
                    <div className="form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        value={userProfile.email}
                        onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Username</label>
                      <input 
                        type="text" 
                        value={userProfile.user_name}
                        onChange={(e) => setUserProfile({...userProfile, user_name: e.target.value})}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="edit-profile-grid-2col">
                    <div className="form-group">
                      <label>Contact No.</label>
                      <input 
                        type="text" 
                        value={userProfile.contact_number}
                        onChange={(e) => setUserProfile({...userProfile, contact_number: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Employee ID</label>
                      <input 
                        type="text" 
                        value={userProfile.employee_no}
                        disabled
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Change Password Section */}
                <div className="password-change-divider">
                  <h3>Change Password</h3>
                  
                  <div className="edit-profile-grid-2col">
                    <div className="form-group">
                      <label>Current Password</label>
                      <input 
                        type="password"
                        placeholder="Enter current password"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input 
                        type="password"
                        placeholder="Enter new password"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password"
                      placeholder="Confirm new password"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Update Changes Button */}
                <button className="btn-primary" style={{ marginTop: '24px' }}>
                  Update Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
