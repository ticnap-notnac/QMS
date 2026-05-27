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
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar activePage={activePage} onPageChange={onPageChange} isUserMenuOpen={isUserMenuOpen} onToggleMenu={onToggleMenu} onLogout={onLogout} isNotificationsOpen={isNotificationsOpen} onToggleNotifications={onToggleNotifications} userRole={userRole} userName={userName} userPosition={userPosition} setProfileTargetTab={setProfileTargetTab} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading...</main>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      <main style={{ flex: 1, width: '95%', maxWidth: '1050px', margin: '40px auto', padding: '0 16px', boxSizing: 'border-box', position: 'relative', zIndex: '10' }}>
        <h1 style={{ marginBottom: '24px', textAlign: 'left', color: '#e2e8f0', fontSize: '28px', fontWeight: '600' }}>Profile Settings</h1>

        {error && <div className="user-info-error" style={{ marginBottom: '20px' }}>{error}</div>}

        {/* Dynamic Nav Tabs Row */}
        <div className="user-info-tabs" style={{ display: 'flex', gap: '4px', borderBottom: 'none', marginBottom: 0 }}>
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
        <div style={{ width: '100%', background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '0 12px 12px 12px', padding: '32px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)', boxSizing: 'border-box', minHeight: '520px' }}>
          
          {/* TAB 1: USER INFORMATION */}
          {activeTab === 'User Information' && (
            <div style={{ display: 'flex', gap: '32px', width: '100%' }}>
              {/* Fake Sidebar structure spacing anchor to align perfectly with the settings subtab row view */}
              <div style={{ width: '200px', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="sidebar-button active" style={{ cursor: 'default', background: 'rgba(6, 182, 212, 0.08)', color: '#22d3ee', border: 'none', textAlign: 'left', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Overview Summary
                </button>
              </div>

              {/* Main Information Panel Box View */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                    {userProfile.first_name?.charAt(0) || 'U'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                    <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '600', color: '#f8fafc' }}>{userProfile.first_name} {userProfile.last_name}</h3>
                    <p style={{ margin: '0', fontSize: '13px', color: '#94a3b8' }}>{userProfile.user_name || 'employee'}</p>
                  </div>
                </div>

                <div className="profile-fields" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '550px', width: '100%' }}>
                  <div style={fieldRowStyle}><span style={fieldLabelStyle}>Username</span><span style={fieldValueStyle}>{userProfile.user_name || '-'}</span></div>
                  <div style={fieldRowStyle}><span style={fieldLabelStyle}>Employee Department</span><span style={fieldValueStyle}>IT Department</span></div>
                  <div style={fieldRowStyle}><span style={fieldLabelStyle}>Position</span><span style={fieldValueStyle}>{userPosition || '-'}</span></div>
                  <div style={fieldRowStyle}><span style={fieldLabelStyle}>Email Address</span><span style={fieldValueStyle}>{userProfile.email || '-'}</span></div>
                  <div style={fieldRowStyle}><span style={fieldLabelStyle}>Contact No.</span><span style={fieldValueStyle}>{userProfile.contact_number || '-'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETTINGS CONTROL VIEWS */}
          {activeTab === 'Settings' && (
            <div style={{ display: 'flex', gap: '32px', width: '100%' }}>
              
              {/* Left Side Tab Navigation */}
              <div className="settings-sidebar" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '20px', boxSizing: 'border-box' }}>
                <button onClick={() => setCurrentSubTab('Profile & Account')} className={`sidebar-button ${currentSubTab === 'Profile & Account' ? 'active' : ''}`} style={sidebarCustomButtonStyle}>Profile & Account</button>
                <button onClick={() => setCurrentSubTab('Reporting Defaults')} className={`sidebar-button ${currentSubTab === 'Reporting Defaults' ? 'active' : ''}`} style={sidebarCustomButtonStyle}>Reporting Defaults</button>
                {userRole === 'admin' && (
                  <button onClick={() => setCurrentSubTab('Audit Tools')} className={`sidebar-button ${currentSubTab === 'Audit Tools' ? 'active' : ''}`} style={sidebarCustomButtonStyle}>Audit Tools</button>
                )}
              </div>

              {/* Right Side Workflow Canvas */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', textAlign: 'left', boxSizing: 'border-box' }}>
                <div className="settings-content-inner" style={{ width: '100%' }}>
                  
                  {currentSubTab === 'Profile & Account' && (
                    <>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '24px' }}>Edit Profile</h2>
                      <div style={{ marginBottom: '24px' }}>
                        <div className="edit-profile-grid-3col">
                          <div className="form-group"><label>First Name</label><input type="text" value={userProfile.first_name} onChange={(e) => setUserProfile({...userProfile, first_name: e.target.value})} className="form-input" /></div>
                          <div className="form-group"><label>Middle Name</label><input type="text" placeholder="N/A" className="form-input" readOnly style={{ opacity: 0.6 }} /></div>
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

                      <div className="password-change-divider" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', marginTop: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#f8fafc', marginBottom: '16px' }}>Change Password</h3>
                        <div className="edit-profile-grid-2col">
                          <div className="form-group"><label>Current Password</label><input type="password" placeholder="Enter current password" className="form-input" /></div>
                          <div className="form-group"><label>New Password</label><input type="password" placeholder="Enter new password" className="form-input" /></div>
                        </div>
                        <div className="form-group"><label>Confirm New Password</label><input type="password" placeholder="Confirm new password" className="form-input" /></div>
                      </div>
                      <button className="btn-primary" style={{ marginTop: '24px' }}>Update Changes</button>
                    </>
                  )}

                  {currentSubTab === 'Reporting Defaults' && (
                    <>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '24px' }}>Reporting Defaults</h2>
                      <div className="form-group" style={{ maxWidth: '320px', marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px' }}>PREFERRED DATE RANGE:</label>
                        <select className="form-input" style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', padding: '8px 12px', outline: 'none', colorScheme: 'dark' }}>
                          <option value="7">Last 7 Days</option>
                          <option value="30">Last 30 Days</option>
                        </select>
                      </div>
                      <button className="btn-primary">Update Changes</button>
                    </>
                  )}

                  {currentSubTab === 'Audit Tools' && userRole === 'admin' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>Audit Checklist:</h2>
                      <div style={{ width: '100%', height: '260px', background: 'rgba(15, 23, 42, 0.4)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Audit Verification Checklist Streams Workspace</span>
                      </div>
                      <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>Update Changes</button>
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

// Seamless Alignment Inline Elements Styling Blocks
const fieldRowStyle = { display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' };
const fieldLabelStyle = { width: '180px', fontSize: '14px', color: '#94a3b8', fontWeight: '500', textAlign: 'left' };
const fieldValueStyle = { flex: '1', fontSize: '14px', color: '#f1f5f9', fontWeight: '500', textAlign: 'left' };
const sidebarCustomButtonStyle = { width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' };