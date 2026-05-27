import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
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
  const [currentSubTab, setCurrentSubTab] = useState('Profile & Account')
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

        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('first_name, last_name, user_name, email, employee_no, contact_number')
            .eq('auth_id', user.id)
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
            setUserProfile(prev => ({ ...prev, email: user.email }))
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
        <h1 className="page-title">Profile Settings</h1>

        {error && <div className="user-info-error">{error}</div>}

        {/* Dynamic Nav Tabs Row */}
        <div className="user-info-tabs">
          <button
            onClick={() => setActiveTab('User Information')}
            className={`user-info-tab-button ${activeTab === 'User Information' ? 'active' : ''}`}
          >
            <User size={18} /> User Information
          </button>
          <button
            onClick={() => setActiveTab('Settings')}
            className={`user-info-tab-button ${activeTab === 'Settings' ? 'active' : ''}`}
          >
            <Settings size={18} /> Settings
          </button>
        </div>

        {/* --- UNIFIED SIZE GLASSMORPHIC FRAME CONTAINER --- */}
        <div className="glass-card-rounded-bottom">
          
          {/* TAB 1: USER INFORMATION */}
          {activeTab === 'User Information' && (
            <div className="two-column-row">
              {/* Fake Sidebar structure spacing anchor to align perfectly with the settings subtab row view */}
              <div className="settings-sidebar">
                <button className="sidebar-button active">
                  Overview Summary
                </button>
              </div>

              {/* Main Information Panel Box View */}
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

          {/* TAB 2: SETTINGS CONTROL VIEWS */}
          {activeTab === 'Settings' && (
            <div className="two-column-row">
              
              {/* Left Side Tab Navigation */}
              <div className="settings-sidebar">
                <button onClick={() => setCurrentSubTab('Profile & Account')} className={`sidebar-button ${currentSubTab === 'Profile & Account' ? 'active' : ''}`}>Profile & Account</button>
                <button onClick={() => setCurrentSubTab('Reporting Defaults')} className={`sidebar-button ${currentSubTab === 'Reporting Defaults' ? 'active' : ''}`}>Reporting Defaults</button>
                {userRole === 'admin' && (
                  <button onClick={() => setCurrentSubTab('Audit Tools')} className={`sidebar-button ${currentSubTab === 'Audit Tools' ? 'active' : ''}`}>Audit Tools</button>
                )}
              </div>

              {/* Right Side Workflow Canvas */}
              <div className="settings-main-flow">
                <div className="settings-content-inner full-width">
                  
                  {currentSubTab === 'Profile & Account' && (
                    <>
                      <h2>Edit Profile</h2>
                      <div className="mb-24">
                        <div className="edit-profile-grid-3col">
                          <div className="form-group"><label>First Name</label><input type="text" value={userProfile.first_name} onChange={(e) => setUserProfile({...userProfile, first_name: e.target.value})} className="form-input" /></div>
                          <div className="form-group"><label>Middle Name</label><input type="text" placeholder="N/A" className="form-input readOnlyOpacity" readOnly /></div>
                          <div className="form-group"><label>Last Name</label><input type="text" value={userProfile.last_name} onChange={(e) => setUserProfile({...userProfile, last_name: e.target.value})} className="form-input" /></div>
                        </div>
                        <div className="edit-profile-grid-2col">
                          <div className="form-group"><label>Email Address</label><input type="email" value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} className="form-input" /></div>
                          <div className="form-group"><label>Username</label><input type="text" value={userProfile.user_name} onChange={(e) => setUserProfile({...userProfile, user_name: e.target.value})} className="form-input" /></div>
                        </div>
                        <div className="edit-profile-grid-2col">
                          <div className="form-group"><label>Contact No.</label><input type="text" value={userProfile.contact_number} onChange={(e) => setUserProfile({...userProfile, contact_number: e.target.value})} className="form-input" /></div>
                          <div className="form-group"><label>Employee ID</label><input type="text" value={userProfile.employee_no} disabled className="form-input" /></div>
                        </div>
                      </div>

                      <div className="password-change-divider">
                        <h3>Change Password</h3>
                        <div className="edit-profile-grid-2col">
                          <div className="form-group"><label>Current Password</label><input type="password" placeholder="Enter current password" className="form-input" /></div>
                          <div className="form-group"><label>New Password</label><input type="password" placeholder="Enter new password" className="form-input" /></div>
                        </div>
                        <div className="form-group"><label>Confirm New Password</label><input type="password" placeholder="Confirm new password" className="form-input" /></div>
                      </div>
                      <button className="btn-primary mt-24">Update Changes</button>
                    </>
                  )}

                  {currentSubTab === 'Reporting Defaults' && (
                    <>
                      <h2>Reporting Defaults</h2>
                      <div className="form-group max-w-320 mb-24">
                        <label>PREFERRED DATE RANGE:</label>
                        <select className="form-input">
                          <option value="7">Last 7 Days</option>
                          <option value="30">Last 30 Days</option>
                        </select>
                      </div>
                      <button className="btn-primary">Update Changes</button>
                    </>
                  )}

                  {currentSubTab === 'Audit Tools' && userRole === 'admin' && (
                    <div className="audit-stack">
                      <h2 className="audit-title">Audit Checklist:</h2>
                      <div className="audit-canvas">
                        <span className="audit-canvas-text">Audit Verification Checklist Streams Workspace</span>
                      </div>
                      <button className="btn-primary self-start">Update Changes</button>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// Inline style constants migrated to CSS (removed)