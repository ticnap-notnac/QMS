import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import useAuditToolsLogic from '../hooks/useAuditToolsLogic'
import { AuditLogsTab, AuditReportsTab, AuditSchedulesTab } from '../components/AuditTools/AuditToolsTabs'
import { AuditChecklistSection, AuditRunDetailsModal } from '../components/AuditTools/AuditToolsModals'
import './PagesStyles.css'

export default function AuditToolsPage({ authUserId }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isInsideSettings = location.pathname.startsWith('/settings')
  const tabParam = searchParams.get('tab')

  const logic = useAuditToolsLogic({ authUserId, activeTabParam: tabParam || 'Logs' })
  const { activeTab, setActiveTab, activeRun } = logic

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams, setActiveTab])

  const renderTabs = () => (
    <div className="tab-navigation">
      {['Logs', 'Reports', 'Schedules'].map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`tab-button ${activeTab === tab ? 'active' : ''}`}
        >
          {tab === 'Logs' ? 'Audit Logs' : tab === 'Reports' ? 'Audit Reports' : 'Audit Schedules'}
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
    return null
  }

  if (activeRun) {
    return (
      <div className={isInsideSettings ? "settings-content-inner" : "audit-main"} style={{ width: '100%' }}>
        <AuditChecklistSection {...logic} />
      </div>
    )
  }

  return (
    <div className={isInsideSettings ? "settings-content-inner" : "audit-main"} style={{ width: '100%' }}>
      {!isInsideSettings && <h1>Audit Tools</h1>}
      {isInsideSettings && <h2 className="settings-section-title">Audit Tools</h2>}
      {renderTabs()}
      {renderTabContent()}
      <AuditRunDetailsModal {...logic} />
    </div>
  )
}
