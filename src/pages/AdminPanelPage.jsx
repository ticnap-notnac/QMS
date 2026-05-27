import { useState } from 'react'
import Navbar from '@/components/Navbar'
import './PagesStyles.css'

export default function AdminPanelPage({
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
  const [adminTab, setAdminTab] = useState('Roles')
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [roleData, setRoleData] = useState('')

  const handleAddDepartment = () => {
    if (departmentName.trim()) {
      console.log('Adding department:', departmentName)
      setDepartmentName('')
    }
  }

  const handleAddRole = () => {
    if (roleData.trim()) {
      console.log('Adding role:', roleData)
      setRoleData('')
    }
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

      {userRole === 'admin' ? (
        <main className="admin-panel-main">
          <h1 className="admin-panel-title">Admin Panel</h1>

          {/* Admin Tab Navigation */}
          <div className="admin-tab-navigation">
            {['Users', 'Dept', 'Roles', 'ISO Module'].map((tab) => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                className={`admin-tab-button ${adminTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search and Action Row */}
          <div className="admin-search-row">
            <div className="admin-search-container">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />
              <span className="admin-search-icon">🔍</span>
            </div>
            <button
              onClick={adminTab === 'Roles' ? handleAddRole : adminTab === 'Dept' ? handleAddDepartment : () => {}}
              className="admin-add-button"
            >
              Add {adminTab}
            </button>
          </div>

          {/* Tab Content */}
          <div className="admin-content-area">
            {adminTab === 'Users' && (
              <div className="admin-content-section">
                <h3 className="admin-content-title">Manage Users</h3>
                <p className="admin-content-text">User management functionality will be added here</p>
              </div>
            )}

            {adminTab === 'Dept' && (
              <div className="admin-content-section">
                <h3 className="admin-content-title">Manage Departments</h3>
                <div className="admin-form-group">
                  <label className="admin-label">Department Name</label>
                  <input
                    type="text"
                    placeholder="Enter department name"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="admin-input-field"
                  />
                </div>
              </div>
            )}

            {adminTab === 'Roles' && (
              <div className="admin-content-section">
                <h3 className="admin-content-title">Manage Roles</h3>
                <div className="admin-form-group">
                  <label className="admin-label">Role Name</label>
                  <input
                    type="text"
                    placeholder="Enter role name"
                    value={roleData}
                    onChange={(e) => setRoleData(e.target.value)}
                    className="admin-input-field"
                  />
                </div>
              </div>
            )}

            {adminTab === 'ISO Module' && (
              <div className="admin-content-section">
                <h3 className="admin-content-title">Manage ISO Modules</h3>
                <p className="admin-content-text">ISO module management functionality will be added here</p>
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="admin-access-denied-main">
          <h1 className="admin-access-denied-title">Access Denied</h1>
          <div className="admin-access-denied-message">
            You don't have permission to access the Admin Panel. Only administrators can access this page.
          </div>
        </main>
      )}
    </>
  )
}
