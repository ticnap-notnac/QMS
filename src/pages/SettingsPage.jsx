import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Navbar from '@/components/Navbar'
import './PagesStyles.css'

export default function SettingsPage({
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
}) {
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    user_name: '',
    email: '',
    employee_no: '',
    contact_number: '',
  })
  const [activeSection, setActiveSection] = useState('Profile & Account')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

      <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px', color: '#e2e8f0' }}>Settings</h1>

        {error && (
          <div className="user-info-error">
            {error}
          </div>
        )}

        <div className="settings-container">
          {/* Sidebar */}
          <div className="settings-sidebar">
            <button 
              onClick={() => setActiveSection('Profile & Account')}
              className={`sidebar-button ${activeSection === 'Profile & Account' ? 'active' : ''}`}
            >
              Profile & Account
            </button>
            <button 
              onClick={() => setActiveSection('Reporting Defaults')}
              className={`sidebar-button ${activeSection === 'Reporting Defaults' ? 'active' : ''}`}
            >
              Reporting Defaults
            </button>
            <button 
              onClick={() => setActiveSection('Audit Tools')}
              className={`sidebar-button ${activeSection === 'Audit Tools' ? 'active' : ''}`}
            >
              Audit Tools
            </button>
          </div>

          {/* Content Area */}
          <div className="settings-main">
            {/* Profile & Account Section */}
            {activeSection === 'Profile & Account' && (
              <div className="settings-content">
                <h2>Edit Profile</h2>
                
                <div style={{ marginBottom: '24px' }}>
                  <div className="form-row-3">
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

                  <div className="form-row-2">
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

                  <div className="form-row-2">
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
                <div className="password-section">
                  <h3>Change Password</h3>
                  
                  <div className="form-row-2">
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
            )}

            {/* Reporting Defaults Section */}
            {activeSection === 'Reporting Defaults' && (
              <div className="settings-content">
                <h2>Reporting Defaults</h2>
                <div className="placeholder-box">
                  <p>Reporting preferences will be configured here.</p>
                </div>
              </div>
            )}

            {/* Audit Tools Section */}
            {activeSection === 'Audit Tools' && (
              <div className="settings-content">
                <h2>Audit Tools</h2>
                <div className="placeholder-box">
                  <p>Audit tools and utilities will be available here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
