import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
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
      <main className="page-container" style={{ width: '95%', maxWidth: '1050px', margin: '40px auto', padding: '0 16px', boxSizing: 'border-box' }}>
        <h1 className="page-heading" style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: '#ffffff' }}>Settings</h1>

        <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

        {error && <div className="user-info-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* 🔮 UNIFORM METRIC CANVAS CARD GLASS DESIGN */}
        <div className="settings-container" style={{ display: 'flex', gap: '32px', width: '100%', minHeight: '560px', background: 'rgba(13, 26, 45, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '32px', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(10px)' }}>
          
          {/* Sidebar Navigation */}
          <div className="settings-sidebar" style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          <div className="settings-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
            
            {/* Profile & Account Section */}
            {activeSection === 'Profile & Account' && (
              <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#ffffff' }}>Edit Profile</h2>
                
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
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>Change Password</h3>
                  
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
                  className="btn-primary mt-24"
                  onClick={handleUpdateChanges}
                  disabled={saving}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {saving ? 'Saving...' : 'Update Changes'}
                </button>
              </div>
            )}

            {/* Reporting Defaults Section */}
            {activeSection === 'Reporting Defaults' && (
              <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#ffffff' }}>Reporting Defaults</h2>
                <div className="placeholder-box" style={{ flex: 1, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', background: 'rgba(15,23,42,0.15)' }}>
                  <p style={{ color: '#64748b', margin: 0 }}>Reporting preferences will be configured here.</p>
                </div>
              </div>
            )}

            {/* Audit Tools Section */}
            {activeSection === 'Audit Tools' && userRole === 'admin' && (
              <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#ffffff' }}>Audit Tools</h2>
                <div className="placeholder-box" style={{ flex: 1, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', background: 'rgba(15,23,42,0.15)' }}>
                  <p style={{ color: '#64748b', margin: 0 }}>Audit tools and utilities will be available here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}