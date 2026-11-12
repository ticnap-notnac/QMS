import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import Toast from '@/components/UI/Toast.jsx'
import useAuditToolsLogic from '../hooks/useAuditToolsLogic'
import { AuditLogsTab, AuditReportsTab, AuditSchedulesTab, AuditTemplatesTab } from '../components/AuditTools/AuditToolsTabs'
import { AuditChecklistSection, AuditRunDetailsModal } from '../components/AuditTools/AuditToolsModals'
import CARDetailsModal from '../components/Modals/CARDetailsModal.jsx'
import QDDRDetailsModal from '../components/Modals/QDDRDetailsModal.jsx'
import SubmissionLoadingOverlay from '../components/UI/SubmissionLoadingOverlay.jsx'
import './SettingsPage.css'


export default function AuditToolsPage({ authUserId, userRole, userPermissions }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isInsideSettings = location.pathname.startsWith('/settings')
  const tabParam = searchParams.get('tab')
  const hasExplicitRights = Array.isArray(userPermissions?.rights)
  const rights = hasExplicitRights ? userPermissions.rights : []
  const canManageAuditSchedules = hasExplicitRights ? rights.includes('manage_audit_schedules') : true
  const availableAuditTabs = canManageAuditSchedules
    ? ['Logs', 'Reports', 'Schedules', 'Templates']
    : ['Logs', 'Reports']

  const logic = useAuditToolsLogic({ authUserId, activeTabParam: tabParam || 'Logs' })
  const { activeTab, setActiveTab, activeRun } = logic

  // Aggregate loading and saving states for overlay progress spinner feedback
  const isOverlayLoading = logic.loading || logic.saving || logic.savingProgress
  let overlayMessage = ''
  if (logic.loading) overlayMessage = 'Processing audit schedule...'
  else if (logic.saving) overlayMessage = 'Saving template...'
  else if (logic.savingProgress) overlayMessage = 'Saving checklist progress...'

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams, setActiveTab])

  const renderTabs = () => (
    <div className="tab-navigation">
      {availableAuditTabs.map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`tab-button ${activeTab === tab ? 'active' : ''}`}
        >
          {{
            Logs: 'Audit Logs',
            Reports: 'Audit Reports',
            Schedules: 'Audit Schedules',
            Templates: 'Checklist Templates'
          }[tab]}
        </button>
      ))}
    </div>
  )

  const renderTabContent = () => {
    if (activeTab === 'Logs') {
      return <AuditLogsTab isInsideSettings={isInsideSettings} {...logic} />
    }
    if (activeTab === 'Reports') {
      return <AuditReportsTab isInsideSettings={isInsideSettings} {...logic} />
    }
    if (activeTab === 'Schedules') {
      return <AuditSchedulesTab isInsideSettings={isInsideSettings} {...logic} />
    }
    if (activeTab === 'Templates') {
      return <AuditTemplatesTab isInsideSettings={isInsideSettings} {...logic} />
    }
    return null
  }

  const mainContent = (
    <div className={isInsideSettings ? "settings-content-inner" : "audit-main"} style={{ width: '100%' }}>
      {logic.toast && (
        <Toast
          message={logic.toast.message}
          type={logic.toast.type}
          onClose={() => logic.setToast(null)}
        />
      )}
      {!isInsideSettings && (
        <>
          <h1>Audit Tools</h1>
          <SettingsNavbar userRole={userRole} />
        </>
      )}
      {activeRun ? (
        <AuditChecklistSection {...logic} />
      ) : (
        <>
          {isInsideSettings && <h2 className="settings-section-title">Audit Tools</h2>}
          {renderTabs()}
          {renderTabContent()}
          <AuditRunDetailsModal {...logic} />
        </>
      )}
      <CARDetailsModal
        isOpen={logic.isCarDetailsModalOpen}
        onClose={logic.closeCarDetails}
        car={logic.selectedCar}
        onSubmitCapa={null}
        onVerify={null}
        userRole="auditor"
        authUserId={authUserId}
        readOnly={true}
      />
      <QDDRDetailsModal
        isOpen={logic.isQddrDetailsModalOpen}
        onClose={logic.closeQddrDetails}
        qddr={logic.selectedQddr}
        onUpdateQddr={null}
        users={[]}
        usersLoading={false}
        userRole="auditor"
        authUserId={authUserId}
        readOnly={true}
      />
      <SubmissionLoadingOverlay isOpen={isOverlayLoading} message={overlayMessage} />
    </div>
  )

  if (isInsideSettings) {
    return mainContent
  }

  return (
    <div className="page-root">
      {mainContent}
    </div>
  )
}

