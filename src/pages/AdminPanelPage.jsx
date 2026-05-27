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
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
        <main style={{ flex: 1, width: '95%', maxWidth: '1050px', margin: '40px auto', padding: '0 16px', boxSizing: 'border-box', position: 'relative', zIndex: '10' }}>
          <h1 style={{ marginBottom: '24px', textAlign: 'left', color: '#e2e8f0', fontSize: '28px', fontWeight: '600' }}>Admin Panel</h1>

          {/* Symmetrical Master Dashboard Menu Navigation Bar Row */}
          <div className="user-info-tabs" style={{ display: 'flex', gap: '4px', borderBottom: 'none', marginBottom: 0 }}>
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
              style={{ cursor: 'default' }}
            >
              Admin Panel
            </button>
          </div>

          {/* Outer Glassmorphic Border Canvas Frame */}
          <div style={{ width: '100%', background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '0 12px 12px 12px', padding: '32px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)', boxSizing: 'border-box', minHeight: '520px' }}>
            
            {/* Row 1: Subpill filters selection header row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '24px' }}>
              {['Users', 'Dept', 'Roles', 'ISO Module'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAdminTab(tab)}
                  style={{
                    background: adminTab === tab ? '#000000' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: adminTab === tab ? '#ffffff' : '#cbd5e1',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Row 2: Search Input and Actions Filter Workspace Bar */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
              <div style={{ flex: '1', position: 'relative', maxWidth: '380px' }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: '36px', background: '#ffffff', border: '1px solid #737373', borderRadius: '4px', padding: '0 36px 0 12px', fontSize: '12px', color: '#000000', outline: 'none', boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#64748b', fontSize: '12px' }}>🔍</span>
              </div>
              
              <button
                onClick={adminTab === 'Roles' ? handleAddRole : adminTab === 'Dept' ? handleAddDepartment : () => {}}
                style={{ background: '#737373', border: 'none', color: '#ffffff', height: '36px', padding: '0 16px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
              >
                + Add {adminTab === 'ISO Module' ? 'Modules' : adminTab}
              </button>
            </div>

            {/* Row 3: Inner Component Sheets Workspace Canvas */}
            <div style={{ width: '100%', height: '320px', background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'left', padding: '24px', boxSizing: 'border-box' }}>
              {adminTab === 'Users' && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f8fafc' }}>Manage Users</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>User management functionality subsystem streams window</p>
                </div>
              )}

              {adminTab === 'Dept' && (
                <div style={{ width: '100%', maxWidth: '320px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc' }}>Manage Departments</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#94a3b8' }}>Department Name</label>
                    <input
                      type="text"
                      placeholder="Enter department name"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      style={{ width: '100%', height: '36px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {adminTab === 'Roles' && (
                <div style={{ width: '100%', maxWidth: '320px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc' }}>Manage Roles</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#94a3b8' }}>Role Name</label>
                    <input
                      type="text"
                      placeholder="Enter role name"
                      value={roleData}
                      onChange={(e) => setRoleData(e.target.value)}
                      style={{ width: '100%', height: '36px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {adminTab === 'ISO Module' && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f8fafc' }}>Manage ISO Modules</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>ISO module management functionality subsystem streams window</p>
                </div>
              )}
            </div>

          </div>
        </main>
      ) : (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#f8fafc' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '16px' }}>Access Denied</h1>
          <div style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '480px', lineHeight: '1.6' }}>
            You don't have permission to access the Admin Panel. Only administrators can access this page.
          </div>
        </main>
      )}
    </div>
  )
}