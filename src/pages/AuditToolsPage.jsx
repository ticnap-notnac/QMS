import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import './SettingsPage.css'
import './PagesStyles.css'

export default function AuditToolsPage({
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
}) {
  const [activeTab, setActiveTab] = useState('Logs')

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

      <main className="audit-main">
        <h1>Audit Tools</h1>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('Logs')}
            className={`tab-button ${activeTab === 'Logs' ? 'active' : ''}`}
          >
            Audit Logs
          </button>

          <button
            onClick={() => setActiveTab('Reports')}
            className={`tab-button ${activeTab === 'Reports' ? 'active' : ''}`}
          >
            Audit Reports
          </button>
        </div>

        {/* Audit Logs Tab */}
        {activeTab === 'Logs' && (
          <div className="tab-content">
            <h2>Audit Logs</h2>
            <div className="placeholder-box">
              <p>System audit logs will be displayed here.</p>
              <p>Track all user activities, system changes, and important events.</p>
            </div>
          </div>
        )}

        {/* Audit Reports Tab */}
        {activeTab === 'Reports' && (
          <div className="tab-content">
            <h2>Audit Reports</h2>
            <div className="placeholder-box">
              <p>Generate and view audit reports.</p>
              <p>Export compliance reports and audit trails for compliance purposes.</p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
