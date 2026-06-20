import { useState, useEffect } from 'react'

import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import Toast from '@/components/UI/Toast'
import useSettingsPageLogic from '@/hooks/useSettingsPageLogic'
import SettingsProfileForm from '@/components/Forms/SettingsProfileForm'
import PasswordSection from '@/components/Auth/PasswordSection'
import AuditToolsPage from './AuditToolsPage'
import SubmissionLoadingOverlay from '@/components/UI/SubmissionLoadingOverlay.jsx'
import './SettingsPage.css'

export default function SettingsPage(props) {
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

  if (loading) {
    return (
      <>
        <main className="page-padding">Loading...</main>
      </>
    )
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
            <button onClick={() => setActiveSection('Profile & Account')} className={`sidebar-button ${activeSection === 'Profile & Account' ? 'active' : ''}`}>
              Profile & Account
            </button>
            {(userRole === 'admin' || userRole === 'auditor') && (
              <button onClick={() => setActiveSection('Audit Tools')} className={`sidebar-button ${activeSection === 'Audit Tools' ? 'active' : ''}`}>
                Audit Tools
              </button>
            )}
          </div>

          <div className="settings-main settings-main--profile">
            {activeSection === 'Profile & Account' && (
              <div className="settings-content settings-content--profile">
                <SettingsProfileForm {...{ userProfile, setUserProfile }} />
                <PasswordSection {...{ passwords, setPasswords }} />
                <button className="btn-primary mt-24 settings-save-button" onClick={handleUpdateChanges} disabled={saving}>
                  {saving ? 'Saving...' : 'Update Changes'}
                </button>
              </div>
            )}


            {activeSection === 'Audit Tools' && (userRole === 'admin' || userRole === 'auditor') && (
              <div className="settings-content settings-content--profile" style={{ width: '100%' }}>
                <AuditToolsPage {...props} />
              </div>
            )}
          </div>
        </div>
      </main>
      <SubmissionLoadingOverlay isOpen={saving} message="Saving settings changes..." />
    </>
  )
}