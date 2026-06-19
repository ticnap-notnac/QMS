import { PlusCircle, Save, CheckCircle2, List } from 'lucide-react'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import Toast from '@/components/UI/Toast'
import { useISOStandardsLogic } from '@/hooks/useAdminPanel.js'
import { AddStandardSection, AddClausesSection, ManageClausesSection, ToggleStandardsSection } from '@/components/ISOStandards/ISOStandardsViews'
import './AdminPanel.css'

export default function ISOStandardsPage({ userRole, userName }) {
  const {
    toast, setToast, activeSection, setActiveSection, standardsError, addStandardSectionProps,
    addClausesSectionProps, manageClausesSectionProps, toggleStandardsSectionProps
  } = useISOStandardsLogic({ userName })

  return (
    <div className="page-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {userRole === 'admin' ? (
        <main className="page-main-wide iso-standards-page">
          <h1 className="page-title">Admin - ISO Standards</h1>
          <SettingsNavbar userRole={userRole} />
          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel iso-standards-panel">
              <div className="admin-top-row"><div className="admin-tabs-wrap"><AdminNavbar activeTab="ISO Standards" /></div></div>
              <div className="glass-card-content iso-standards-content">
                <div className="iso-section-tabs" role="tablist" aria-label="ISO standards sections">
                  <button type="button" className={`iso-section-tab ${activeSection === 'Add Standard' ? 'active' : ''}`} onClick={() => setActiveSection('Add Standard')}><PlusCircle size={16} />Add Standard</button>
                  <button type="button" className={`iso-section-tab ${activeSection === 'Add Clauses' ? 'active' : ''}`} onClick={() => setActiveSection('Add Clauses')}><Save size={16} />Add Clauses</button>
                  <button type="button" className={`iso-section-tab ${activeSection === 'Toggle Standards' ? 'active' : ''}`} onClick={() => setActiveSection('Toggle Standards')}><CheckCircle2 size={16} />Toggle Standards</button>
                  <button type="button" className={`iso-section-tab ${activeSection === 'Manage Clauses' ? 'active' : ''}`} onClick={() => setActiveSection('Manage Clauses')}><List size={16} />Manage Clauses</button>
                </div>
                {standardsError && <div className="iso-banner iso-banner--error"><span>{standardsError}</span></div>}
                {activeSection === 'Add Standard' && <AddStandardSection {...addStandardSectionProps} />}
                {activeSection === 'Add Clauses' && <AddClausesSection {...addClausesSectionProps} />}
                {activeSection === 'Manage Clauses' && <ManageClausesSection {...manageClausesSectionProps} />}
                {activeSection === 'Toggle Standards' && <ToggleStandardsSection {...toggleStandardsSectionProps} />}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="page-main-centered">
          <h1 className="page-title">Access Denied</h1>
          <div className="access-denied-text">You don't have permission to access this page.</div>
        </main>
      )}
    </div>
  )
}