import { Bell } from 'lucide-react'

export default function Navbar({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  onToggleNotifications,
  userRole,
  userName,
  userPosition,
  setIsAdminPanelOpen,
  setIsAuditToolsOpen,
  setProfileTargetTab 
}) {
  return (
    <header className="app-navbar">
      
      {/* Brand Logo Identity Section */}
      <div onClick={() => onPageChange('Dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', height: '32px', width: '32px', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', fontWeight: 'bold', color: 'white' }}>
          <span>Q</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#22d3ee', lineHeight: '1.2' }}>QFlow</span>
          <span style={{ fontSize: '8px', textTransform: 'uppercase', color: '#94a3b8', lineHeight: '1' }}>Quality Management System</span>
        </div>
      </div>

      {/* Main Center Navigation Tabs — Kept perfectly clean and unified */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => onPageChange('Dashboard')} style={{ background: 'none', border: 'none', color: activePage === 'Dashboard' ? '#22d3ee' : '#94a3b8', padding: '6px 12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Dashboard</button>
        <button onClick={() => onPageChange('Reports')} style={{ background: 'none', border: 'none', color: activePage === 'Reports' ? '#22d3ee' : '#94a3b8', padding: '6px 12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Reports</button>
        <button onClick={() => onPageChange('ISO')} style={{ background: 'none', border: 'none', color: activePage === 'ISO' ? '#22d3ee' : '#94a3b8', padding: '6px 12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>ISO</button>
        <button onClick={() => onPageChange('DCC')} style={{ background: 'none', border: 'none', color: activePage === 'DCC' ? '#22d3ee' : '#94a3b8', padding: '6px 12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>DCC</button>
      </nav>

      {/* Profile/Settings/Admin Navigation Tabs — Only show on Profile, Settings, and Admin pages */}
      {(activePage === 'Profile' || activePage === 'Settings' || activePage === 'AdminPanel') && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '-8px' }}>
          <button
            onClick={() => onPageChange('Profile')}
            className="user-info-tab-button"
            style={{ background: 'none', border: 'none', color: activePage === 'Profile' ? '#22d3ee' : '#94a3b8', padding: '10px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            User Information
          </button>
          <button
            onClick={() => onPageChange('Settings')}
            style={{ background: 'none', border: 'none', color: activePage === 'Settings' ? '#22d3ee' : '#94a3b8', padding: '10px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Settings
          </button>
          <button
            onClick={() => onPageChange('AdminPanel')}
            style={{ background: 'none', border: 'none', color: activePage === 'AdminPanel' ? '#22d3ee' : '#94a3b8', padding: '10px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Admin Panel
          </button>
        </nav>
      )}

      {/* Right Side Control Utility Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={onToggleNotifications} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Bell size={18} />
        </button>
        
        <div onClick={onToggleMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#e2e8f0' }}>
              {userName || 'Name of the User'}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              {userPosition || 'Position'}
            </span>
          </div>
          <div style={{ height: '32px', width: '32px', borderRadius: '50%', background: userRole === 'admin' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.2)', border: userRole === 'admin' ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)' }}></div>
        </div>
      </div>

      {/* --- REPAIRED DROPDOWN INTERACTIVE ROUTING PANEL --- */}
      {isUserMenuOpen && (
        <div style={{ position: 'absolute', right: '24px', top: '64px', background: 'rgba(13, 27, 49, 0.96)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '6px', minWidth: '170px', display: 'flex', flexDirection: 'column', zIndex: '250', boxShadow: '0 12px 30px rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          
          <button 
            onClick={() => { onPageChange('Profile'); setProfileTargetTab('User Information'); }} 
            style={dropdownItemStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            User Information
          </button>
          
          <button 
            onClick={() => { onPageChange('Settings'); setProfileTargetTab('Settings'); }} 
            style={dropdownItemStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Settings
          </button>

          {/* Admin panel options are preserved inside the dropdown view context list */}
          {userRole === 'admin' && (
            <button 
              onClick={() => onPageChange('Admin Panel')} 
              style={{ ...dropdownItemStyle, color: '#c084fc' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(192,132,252,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Admin Panel
            </button>
          )}
          
          <button 
            onClick={onLogout} 
            style={{ ...dropdownItemStyle, color: '#ef4444', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '8px' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Logout
          </button>
          
        </div>
      )}
    </header>
  )
}

const dropdownItemStyle = { background: 'none', border: 'none', color: '#cbd5e1', padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: '500', cursor: 'pointer', borderRadius: '5px', width: '100%', transition: 'background 0.15s ease' };