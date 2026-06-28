import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import useAuditToolsLogic from '../hooks/useAuditToolsLogic'
import { AuditLogsTab, AuditReportsTab, AuditSchedulesTab, AuditTemplatesTab } from '../components/AuditTools/AuditToolsTabs'
import { AuditChecklistSection, AuditRunDetailsModal } from '../components/AuditTools/AuditToolsModals'
import CARDetailsModal from '../components/Modals/CARDetailsModal.jsx'
import SubmissionLoadingOverlay from '../components/UI/SubmissionLoadingOverlay.jsx'
import './SettingsPage.css'


export default function AuditToolsPage({ authUserId, userRole }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isInsideSettings = location.pathname.startsWith('/settings')
  const tabParam = searchParams.get('tab')

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
      {['Logs', 'Reports', 'Schedules', 'Templates'].map(tab => (
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

  return (
    <div className={isInsideSettings ? "settings-content-inner" : "audit-main"} style={{ width: '100%' }}>
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
      <SubmissionLoadingOverlay isOpen={isOverlayLoading} message={overlayMessage} />
    </div>
  )
}

