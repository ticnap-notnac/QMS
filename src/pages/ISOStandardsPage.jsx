import { PlusCircle, Save, CheckCircle2, List } from 'lucide-react'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import Toast from '@/components/UI/Toast'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
import { useISOStandardsLogic } from '@/hooks/useAdminPanel.js'
import { AddStandardSection, AddClausesSection, ManageClausesSection, ToggleStandardsSection } from '@/components/ISOStandards/ISOStandardsViews'
import './AdminPanel.css'

export default function ISOStandardsPage({ userRole, userName }) {
  const {
    toast, setToast, activeSection, setActiveSection, addStandardSectionProps,
    addClausesSectionProps, manageClausesSectionProps, toggleStandardsSectionProps,
    confirmStandardDialogProps, confirmClauseDialogProps
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
              <div className="search-row">
                <div className="admin-top-row" style={{ width: '100%', marginBottom: '0' }}>
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="ISO Standards" />
                  </div>
                </div>
                <div className="admin-search-actions-row">
                  <div className="iso-section-tabs" role="tablist" aria-label="ISO standards sections" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <button type="button" className={`iso-section-tab ${activeSection === 'Add Standard' ? 'active' : ''}`} onClick={() => setActiveSection('Add Standard')}><PlusCircle size={16} />Add Standard</button>
                    <button type="button" className={`iso-section-tab ${activeSection === 'Add Clauses' ? 'active' : ''}`} onClick={() => setActiveSection('Add Clauses')}><Save size={16} />Add Clauses</button>
                    <button type="button" className={`iso-section-tab ${activeSection === 'Manage Clauses' ? 'active' : ''}`} onClick={() => setActiveSection('Manage Clauses')}><List size={16} />Manage Clauses</button>
                  </div>
                </div>
              </div>
              <div className="glass-card-content iso-standards-content">
                {activeSection === 'Add Standard' && (
                  <>
                    <AddStandardSection {...addStandardSectionProps} />
                    <div style={{ marginTop: '24px' }}>
                      <ToggleStandardsSection {...toggleStandardsSectionProps} />
                    </div>
                  </>
                )}
                {activeSection === 'Add Clauses' && <AddClausesSection {...addClausesSectionProps} />}
                {activeSection === 'Manage Clauses' && <ManageClausesSection {...manageClausesSectionProps} />}
              </div>
            </div>
          </div>
          <ConfirmDialog {...confirmStandardDialogProps} />
          <ConfirmDialog {...confirmClauseDialogProps} />
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