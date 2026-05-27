import { useState } from 'react'
import Navbar from '@/components/Navbar'
// SettingsNavbar intentionally not used here to preserve Admin layout
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
  const [adminTab, setAdminTab] = useState('Users')
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
    <div className="page-root">
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
        <main className="page-main-wide">
          <h1 className="page-title">Admin Panel</h1>

          {/* Symmetrical Master Dashboard Menu Navigation Bar Row */}
          <div className="user-info-tabs">
            <button
              onClick={() => onPageChange('Profile')}
              className="user-info-tab-button"
            >
              User Information
            </button>
            <button
              onClick={() => { onPageChange('Profile'); setProfileTargetTab('Settings'); }}
              className="user-info-tab-button"
            >
              Settings
            </button>
            <button
              className="user-info-tab-button active"
            >
              Admin Panel
            </button>
          </div>

          {/* Outer Glassmorphic Border Canvas Frame */}
            <div className="glass-card-rounded-bottom">
              <div className="admin-inner-panel">
                {/* Row 1: Subpill filters selection header row */}
                <div className="tab-filter">
              {['Users', 'Dept', 'Roles', 'ISO Module'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAdminTab(tab)}
                      className={`filter-button ${adminTab === tab ? 'active' : ''}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Row 2: Search Input and Actions Filter Workspace Bar */}
            <div className="search-row">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-light"
                />
                <span className="search-icon">🔍</span>
              </div>
              
              <button
                onClick={adminTab === 'Roles' ? handleAddRole : adminTab === 'Dept' ? handleAddDepartment : () => {}}
                className="btn-add-action"
              >
                + Add {adminTab === 'ISO Module' ? 'Modules' : adminTab}
              </button>
            </div>

                {/* Row 3: Inner Component Sheets Workspace Canvas */}
                <div className="glass-card-content">
                  {adminTab === 'Users' && (
                    <div>
                      <h3 className="glass-card-heading">Manage Users</h3>
                      <p className="glass-card-subtext">User management functionality subsystem streams window</p>
                    </div>
                  )}

                  {adminTab === 'Dept' && (
                    <div className="panel-narrow">
                      <h3 className="glass-card-heading">Manage Departments</h3>
                      <div className="panel-column">
                        <label className="small-label">Department Name</label>
                        <input
                          type="text"
                          placeholder="Enter department name"
                          value={departmentName}
                          onChange={(e) => setDepartmentName(e.target.value)}
                          className="form-input-reports"
                        />
                      </div>
                    </div>
                  )}

                  {adminTab === 'Roles' && (
                    <div className="panel-narrow">
                      <h3 className="glass-card-heading">Manage Roles</h3>
                      <div className="panel-column">
                        <label className="small-label">Role Name</label>
                        <input
                          type="text"
                          placeholder="Enter role name"
                          value={roleData}
                          onChange={(e) => setRoleData(e.target.value)}
                          className="form-input-reports"
                        />
                      </div>
                    </div>
                  )}

                  {adminTab === 'ISO Module' && (
                    <div>
                      <h3 className="glass-card-heading">Manage ISO Modules</h3>
                      <p className="glass-card-subtext">ISO module management functionality subsystem streams window</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </main>
      ) : (
        <main className="page-main-centered">
          <h1 className="page-title">Access Denied</h1>
          <div className="access-denied-text">
            You don't have permission to access the Admin Panel. Only administrators can access this page.
          </div>
        </main>
      )}
    </div>
  )
}