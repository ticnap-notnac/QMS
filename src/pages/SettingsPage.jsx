import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { insertLog } from '@/services/logService'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
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
  authUserId,
  setProfileTargetTab,
  onProfileUpdate,
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
  const [authId, setAuthId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })

  useEffect(() => {
    if (activeSection === 'Audit Tools' && userRole !== 'admin') {
      setActiveSection('Profile & Account')
    }
  }, [activeSection, userRole])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const currentAuthId = authUserId || user?.id

        if (currentAuthId) {
          setAuthId(currentAuthId)
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
            setUserProfile(prev => ({
              ...prev,
              email: user?.email || prev.email
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
  }, [authUserId])

  const handleUpdateChanges = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error: profileError } = await supabase
        .from('users')
        .update({
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          user_name: userProfile.user_name,
          contact_number: userProfile.contact_number,
        })
        .eq('auth_id', authId)

      if (profileError) throw new Error(profileError.message)

      const updatedFullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      await insertLog({
        level: 'audit',
        source: 'settings',
        userAuthId: authId,
        action: 'profile_update',
        details: {
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          user_name: userProfile.user_name,
          contact_number: userProfile.contact_number,
          display_name: updatedFullName || null,
        },
      })

      if (passwords.current || passwords.new || passwords.confirm) {
        if (!passwords.current) throw new Error('Please enter your current password.')
        if (!passwords.new) throw new Error('Please enter a new password.')
        if (passwords.new !== passwords.confirm) throw new Error('New passwords do not match.')
        if (passwords.new.length < 6) throw new Error('Password must be at least 6 characters.')

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userProfile.email,
          password: passwords.current,
        })
        if (signInError) throw new Error('Current password is incorrect.')

        const { error: passwordError } = await supabase.auth.updateUser({ password: passwords.new })
        if (passwordError) throw new Error(passwordError.message)
    
        setPasswords({ current: '', new: '', confirm: '' })
      }

      if (onProfileUpdate) await onProfileUpdate()
      setSuccess('Profile updated successfully!')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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
      <main className="page-container settings-page-container">
        <h1 className="page-heading settings-page-title">Settings</h1>

        <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

        {error && <div className="user-info-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* 🔮 UNIFORM METRIC CANVAS CARD GLASS DESIGN */}
        <div className="settings-container settings-container--profile">
          
          {/* Sidebar Navigation */}
          <div className="settings-sidebar settings-sidebar--profile">
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
            
            {userRole === 'admin' && (
              <button 
                onClick={() => setActiveSection('Audit Tools')}
                className={`sidebar-button ${activeSection === 'Audit Tools' ? 'active' : ''}`}
              >
                Audit Tools
              </button>
            )}
          </div>

          {/* Main Content Pane Area Canvas */}
          <div className="settings-main settings-main--profile">
            
            {/* Profile & Account Section */}
            {activeSection === 'Profile & Account' && (
              <div className="settings-content settings-content--profile">
                <h2 className="settings-section-title">Edit Profile</h2>
                
                <div className="mb-24">
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
                        readOnly
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

                <div className="password-section">
                  <h3 className="settings-password-title">Change Password</h3>
                  
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Current Password</label>
                      <input 
                        type="password"
                        placeholder="Enter current password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input 
                        type="password"
                        placeholder="Enter new password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password"
                      placeholder="Confirm new password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <button
                  className="btn-primary mt-24 settings-save-button"
                  onClick={handleUpdateChanges}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Update Changes'}
                </button>
              </div>
            )}

            {/* Reporting Defaults Section */}
            {activeSection === 'Reporting Defaults' && (
              <div className="settings-content settings-content--profile">
                <h2 className="settings-section-title">Reporting Defaults</h2>
                <div className="settings-placeholder">
                  <p className="settings-placeholder-text">Reporting preferences will be configured here.</p>
                </div>
              </div>
            )}

            {/* Audit Tools Section */}
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