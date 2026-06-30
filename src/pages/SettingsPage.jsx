import { useState, useEffect } from 'react'

import { useNavigate, useLocation } from 'react-router-dom'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import Toast from '@/components/UI/Toast'
import useSettingsPageLogic from '@/hooks/useSettingsPageLogic'
import SettingsProfileForm from '@/components/Forms/SettingsProfileForm'
import PasswordSection from '@/components/Auth/PasswordSection'
import AuditToolsPage from './AuditToolsPage'
import SubmissionLoadingOverlay from '@/components/UI/SubmissionLoadingOverlay.jsx'
import './SettingsPage.css'

export default function SettingsPage(props) {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    userRole,
    authUserId,
    onProfileUpdate,
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

  const [highContrast, setHighContrast] = useState(false)
  const [textScale, setTextScale] = useState('normal')
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (location.state?.section) {
      setActiveSection(location.state.section)
    }
  }, [location.state])

  useEffect(() => {
    setHighContrast(localStorage.getItem('accessibility-high-contrast') === 'true')
    setTextScale(localStorage.getItem('accessibility-text-scale') || 'normal')
    setReduceMotion(localStorage.getItem('accessibility-reduce-motion') === 'true')
  }, [activeSection])

  const handleSaveAccessibility = () => {
    localStorage.setItem('accessibility-high-contrast', highContrast)
    localStorage.setItem('accessibility-text-scale', textScale)
    localStorage.setItem('accessibility-reduce-motion', reduceMotion)

    // Apply live
    document.body.classList.toggle('high-contrast-mode', highContrast)
    document.documentElement.setAttribute('data-text-scale', textScale)
    document.body.classList.toggle('reduce-motion-mode', reduceMotion)

    setToast({ message: 'Accessibility preferences updated successfully.', type: 'success' })
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="page-container settings-page-container">
        <h1 className="page-heading settings-page-title">Settings</h1>

        <SettingsNavbar userRole={userRole} />

        {/* ── 🚀 DYNAMIC INLINE OVERRIDE ENGINE ── */}
        <div 
          className="settings-container settings-container--profile"
          style={activeSection === 'Audit Tools' ? { maxWidth: '1220px', width: '100%' } : {}}
        >
          <div className="settings-sidebar settings-sidebar--profile">
            <button 
              onClick={() => navigate('/settings/profile')} 
              className="sidebar-button"
            >
              User Information
            </button>
            <button onClick={() => setActiveSection('Profile & Account')} className={`sidebar-button ${activeSection === 'Profile & Account' ? 'active' : ''}`}>
              Profile & Account
            </button>
            <button onClick={() => setActiveSection('Accessibility')} className={`sidebar-button ${activeSection === 'Accessibility' ? 'active' : ''}`}>
              Accessibility
            </button>
          </div>

          <div className="settings-main settings-main--profile">
            {loading ? (
              <div className="settings-content settings-content--profile" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <span className="glass-card-subtext">Loading settings...</span>
              </div>
            ) : (
              <>
                {activeSection === 'Profile & Account' && (
                  <div className="settings-content settings-content--profile">
                    <SettingsProfileForm {...{ userProfile, setUserProfile }} />
                    <PasswordSection {...{ passwords, setPasswords }} />
                    <button className="btn-primary mt-24 settings-save-button" onClick={handleUpdateChanges} disabled={saving}>
                      {saving ? 'Saving...' : 'Update Changes'}
                    </button>
                  </div>
                )}

                {activeSection === 'Accessibility' && (
                  <div className="settings-content settings-content--profile">
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>Accessibility Settings</h2>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>
                      Configure display and navigation helper options to fit your preference.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Contrast Setting */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>High Contrast Mode</strong>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Increase contrast of text and borders for readability.</div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={highContrast}
                          onChange={(e) => setHighContrast(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                      </div>

                      {/* Font Size Setting */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>Text Scaling</strong>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Scales font sizes across dashboard containers.</div>
                        </div>
                        <select 
                          className="form-input" 
                          value={textScale}
                          onChange={(e) => setTextScale(e.target.value)}
                          style={{ width: '140px', padding: '4px 8px', fontSize: '13px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        >
                          <option value="normal">Normal (100%)</option>
                          <option value="large">Large (115%)</option>
                          <option value="xlarge">Extra Large (130%)</option>
                        </select>
                      </div>

                      {/* Animations Setting */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>Reduce Motion</strong>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Disables translation transitions and page micro-animations.</div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={reduceMotion}
                          onChange={(e) => setReduceMotion(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                      </div>
                    </div>

                    <button className="btn-primary mt-24 settings-save-button" onClick={handleSaveAccessibility}>
                      Save Preferences
                    </button>
                  </div>
                )}

                {activeSection === 'Audit Tools' && (userRole === 'admin' || userRole === 'auditor') && (
                  <div className="settings-content settings-content--profile" style={{ width: '100%' }}>
                    <AuditToolsPage {...props} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <SubmissionLoadingOverlay isOpen={saving} message="Saving settings changes..." />
    </>
  )
}