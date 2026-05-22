import { useState } from 'react'
import './App.css'
import Login from './components/Login.jsx'
import IntroModal from './components/IntroModal.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ISOPage from './pages/ISOPage.jsx'
import DCCPage from './pages/DCCPage.jsx'

// Clean Lucide icons mapping for managing common visual references
import { 
  Bell, 
  X, 
  AlertCircle, 
  ArrowLeft, 
  Upload, 
  Folder, 
  File, 
  Image as ImageIcon, 
  Video, 
  User as UserIcon,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  Settings as SettingsIcon,
  Activity,
  IdCard,
  ShieldAlert,
  Briefcase,
  Mail,
  Phone,
  Search,
  Plus
} from 'lucide-react'

export default function App() {
  const [showIntro, setShowIntro] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  // Role tracking state: 'user' or 'admin'
  const [userRole, setUserRole] = useState('user') 
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')

  // Target tab router initialization state inside the Profile canvas
  const [profileTargetTab, setProfileTargetTab] = useState('User Information')

  // Modals for remaining overlay ledgers
  const [isAuditToolsOpen, setIsAuditToolsOpen] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    
    if (username === 'admin' && password === 'admin123') {
      setIsLoggedIn(true)
      setUserRole('admin')
      setError('')
      return
    } else if (username === 'user1' && password === '12345') {
      setIsLoggedIn(true)
      setUserRole('user')
      setError('')
      return
    }
    
    setError('Invalid username or password credentials.')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole('user')
    setIsUserMenuOpen(false)
    setActivePage('Dashboard')
    setProfileTargetTab('User Information')
  }

  const handlePageChange = (page) => {
    setActivePage(page)
    setIsUserMenuOpen(false)
  }

  const renderPage = () => {
    const sharedProps = {
      activePage,
      onPageChange: handlePageChange,
      isUserMenuOpen,
      onToggleMenu: () => setIsUserMenuOpen((open) => !open),
      onLogout: handleLogout,
      isNotificationsOpen,
      onToggleNotifications: () => setIsNotificationsOpen((open) => !open),
      userRole,
      setIsAuditToolsOpen,
      profileTargetTab,      
      setProfileTargetTab    
    }

    if (activePage === 'Profile') {
      return <UserInformationPage {...sharedProps} />
    }
    if (activePage === 'Reports') {
      return <ReportsPage {...sharedProps} />
    }
    if (activePage === 'ISO') {
      return <ISOPage {...sharedProps} />
    }
    if (activePage === 'DCC') {
      return <DCCPage {...sharedProps} />
    }

    return <DashboardPage {...sharedProps} onPageChange={handlePageChange} />
  }

  return (
    <div className="page">
      <div className="bg-orb bg-orb--one" aria-hidden="true"></div>
      <div className="bg-orb bg-orb--two" aria-hidden="true"></div>

      {!isLoggedIn ? (
        <header className="brand">
          <div className="logo">
            <span className="logo-mark">Q</span>
            <span className="logo-text">Flow</span>
          </div>
          <p className="brand-subtitle">QUALITY MANAGEMENT SYSTEM</p>
        </header>
      ) : null}

      {isLoggedIn ? renderPage() : (
        <Login
          username={username}
          password={password}
          error={error}
          onUsernameChange={(event) => setUsername(event.target.value)}
          onPasswordChange={(event) => setPassword(event.target.value)}
          onSubmit={handleSubmit}
          onLearnMore={() => setShowIntro(true)}
        />
      )}

      <IntroModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <AuditToolsModal isOpen={isAuditToolsOpen} onClose={() => setIsAuditToolsOpen(false)} />
    </div>
  )
}

// --- DYNAMIC DESIGN-COMPLIANT MASTER USER & ADMIN TAB PANEL COMPONENT ---
function UserInformationPage({
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  userRole,
  setIsAuditToolsOpen,
  profileTargetTab,
  setProfileTargetTab
}) {
  const [currentSubTab, setCurrentSubTab] = useState('Profile & Account');
  const [adminPillTab, setAdminPillTab] = useState('Users'); 
  const [adminSearch, setAdminSearch] = useState('');
  const [dateRange, setDateRange] = useState('7');

  // --- COMPONENT STATE LOGIC FOR CREATION MODALS ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [rolePositionName, setRolePositionName] = useState(''); 
  const [selectedIsoModule, setSelectedIsoModule] = useState(''); 
  const [newUser, setNewUser] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    username: '',
    contactNo: '',
    department: '',
    position: ''
  });

  const getActionButtonLabel = () => {
    if (adminPillTab === 'Dept') return 'Add Dept';
    if (adminPillTab === 'Roles') return 'Add Roles';
    if (adminPillTab === 'ISO Module') return 'Add Modules'; 
    return 'Add Users';
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Symmetrical Header Nav */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 24px', background: 'rgba(10, 20, 36, 0.8)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: '150' }}>
        <div onClick={() => onPageChange('Dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', height: '32px', width: '32px', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', fontWeight: 'bold', color: 'white' }}>
            <span>Q</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#22d3ee', lineHeight: '1.2' }}>QFlow</span>
            <span style={{ fontSize: '8px', textTransform: 'uppercase', color: '#94a3b8', lineHeight: '1' }}>Quality Management System</span>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => onPageChange('Dashboard')} style={navTabStyle}>Dashboard</button>
          <button onClick={() => onPageChange('Reports')} style={navTabStyle}>Reports</button>
          <button onClick={() => onPageChange('ISO')} style={navTabStyle}>ISO</button>
          <button onClick={() => onPageChange('DCC')} style={navTabStyle}>DCC</button>
          
          {userRole === 'admin' && (
            <>
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }}></div>
              <button onClick={() => setProfileTargetTab('Admin Panel')} style={{ ...navTabStyle, color: profileTargetTab === 'Admin Panel' ? '#a78bfa' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} /> Admin Panel
              </button>
              <button onClick={() => setIsAuditToolsOpen(true)} style={{ ...navTabStyle, color: '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileSpreadsheet size={14} /> Audit Tools
              </button>
            </>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onToggleNotifications} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <Bell size={18} />
          </button>
          <div onClick={onToggleMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#e2e8f0' }}>{userRole === 'admin' ? 'System Administrator' : 'Name of the User'}</span>
              <span style={{ fontSize: '10px', color: userRole === 'admin' ? '#a78bfa' : '#64748b' }}>{userRole === 'admin' ? 'QA Admin' : 'Position'}</span>
            </div>
            <div style={{ height: '32px', width: '32px', borderRadius: '50%', background: userRole === 'admin' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.2)', border: userRole === 'admin' ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)' }}></div>
          </div>
        </div>
      </header>

      {/* Main Profile Canvas Box */}
      <div style={{ width: '95%', maxWidth: '1050px', margin: '40px auto', position: 'relative', zIndex: '10', boxSizing: 'border-box' }}>
        
        {/* --- MAIN MASTER TABS NAVIGATION --- */}
        <div style={{ display: 'flex', gap: '4px', paddingLeft: '8px' }}>
          <button onClick={() => setProfileTargetTab('User Information')} style={{ ...tabToggleStyle, background: profileTargetTab === 'User Information' ? 'rgba(13, 26, 45, 0.65)' : 'transparent', color: profileTargetTab === 'User Information' ? '#22d3ee' : '#64748b' }}>User Information</button>
          <button onClick={() => setProfileTargetTab('Settings')} style={{ ...tabToggleStyle, background: profileTargetTab === 'Settings' ? 'rgba(13, 26, 45, 0.65)' : 'transparent', color: profileTargetTab === 'Settings' ? '#22d3ee' : '#64748b' }}>Settings</button>
          
          {userRole === 'admin' && (
            <button onClick={() => setProfileTargetTab('Admin Panel')} style={{ ...tabToggleStyle, background: profileTargetTab === 'Admin Panel' ? 'rgba(13, 26, 45, 0.65)' : 'transparent', color: profileTargetTab === 'Admin Panel' ? '#a78bfa' : '#64748b' }}>
              Admin Panel
            </button>
          )}
        </div>

        {/* --- MASTER GLASSMORPHIC PANEL DISPLAY CANVAS --- */}
        <div style={{ width: '100%', background: 'rgba(13, 26, 45, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '0 12px 12px 12px', padding: '32px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)', boxSizing: 'border-box', minHeight: '480px' }}>
          
          {/* TAB OPTION 1: USER INFORMATION */}
          {profileTargetTab === 'User Information' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.15)', border: userRole === 'admin' ? '2px solid #a78bfa' : '2px solid #06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={32} style={{ color: userRole === 'admin' ? '#a78bfa' : '#22d3ee' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                  <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '600', color: '#f8fafc' }}>{userRole === 'admin' ? 'System Administrator' : 'Name of the User'}</h2>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Access Scope: {userRole.toUpperCase()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '550px', width: '100%', textAlign: 'left' }}>
                <div style={fieldRowStyle}><IdCard size={16} style={fieldIconStyle} /><span style={fieldLabelStyle}>Username:</span><div style={fieldValueStyle}>—</div></div>
                <div style={fieldRowStyle}><ShieldAlert size={16} style={fieldIconStyle} /><span style={fieldLabelStyle}>Employee Department:</span><div style={fieldValueStyle}>—</div></div>
                <div style={fieldRowStyle}><Briefcase size={16} style={fieldIconStyle} /><span style={fieldLabelStyle}>Position:</span><div style={fieldValueStyle}>—</div></div>
                <div style={fieldRowStyle}><Mail size={16} style={fieldIconStyle} /><span style={fieldLabelStyle}>Email Address:</span><div style={fieldValueStyle}>—</div></div>
                <div style={fieldRowStyle}><Phone size={16} style={fieldIconStyle} /><span style={fieldLabelStyle}>Contact No.:</span><div style={fieldValueStyle}>—</div></div>
              </div>
            </div>
          )}

          {/* TAB OPTION 2: SETTINGS PROFILE LAYOUT (WITH SIDEBAR CONFIG) */}
          {profileTargetTab === 'Settings' && (
            <div style={{ display: 'flex', gap: '32px', minHeight: '420px', width: '100%' }}>
              
              {/* --- SIDEBAR WORKSPACE LIST --- */}
              <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '20px' }}>
                <button onClick={() => setCurrentSubTab('Profile & Account')} style={{ ...sideTabStyle, background: currentSubTab === 'Profile & Account' ? 'rgba(6, 182, 212, 0.12)' : 'transparent', color: currentSubTab === 'Profile & Account' ? '#22d3ee' : '#94a3b8' }}>Profile & Account</button>
                <button onClick={() => setCurrentSubTab('Reporting Defaults')} style={{ ...sideTabStyle, background: currentSubTab === 'Reporting Defaults' ? 'rgba(6, 182, 212, 0.12)' : 'transparent', color: currentSubTab === 'Reporting Defaults' ? '#22d3ee' : '#94a3b8' }}>Reporting Defaults</button>
                
                {/* 💡 REPAIRED: Hidden behind role guard layout. Standard users will not see this option */}
                {userRole === 'admin' && (
                  <button onClick={() => setCurrentSubTab('Audit Tools')} style={{ ...sideTabStyle, background: currentSubTab === 'Audit Tools' ? 'rgba(6, 182, 212, 0.12)' : 'transparent', color: currentSubTab === 'Audit Tools' ? '#22d3ee' : '#94a3b8' }}>Audit Tools</button>
                )}
              </div>

              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '32px', textAlign: 'left' }}>
                {currentSubTab === 'Profile & Account' && (
                  <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '32px', margin: '0' }}>
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>Edit Profile fields:</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div><label style={subLabelStyle}>First Name:</label><input type="text" style={subInputStyle} /></div>
                        <div><label style={subLabelStyle}>Middle Name:</label><input type="text" style={subInputStyle} /></div>
                        <div><label style={subLabelStyle}>Last Name:</label><input type="text" style={subInputStyle} /></div>
                        <div><label style={subLabelStyle}>Email Address:</label><input type="email" style={subInputStyle} /></div>
                        <div><label style={subLabelStyle}>Username:</label><input type="text" style={subInputStyle} /></div>
                        <div><label style={subLabelStyle}>Contact No.:</label><input type="text" style={subInputStyle} /></div>
                      </div>
                    </div>
                  </form>
                )}

                {currentSubTab === 'Reporting Defaults' && (
                  <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '32px', margin: '0', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>Preferred Date Range:</h4>
                      <div style={{ maxWidth: '280px', width: '100%' }}>
                        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ width: '100%', height: '38px', background: 'rgba(8, 18, 35, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}>
                          <option value="7">Last 7 Days</option>
                          <option value="30">Last 30 Days</option>
                        </select>
                      </div>
                    </div>
                  </form>
                )}

                {/* --- WORKSPACE CANVAS VIEW FOR NESTED AUDIT TOOLS --- */}
                {currentSubTab === 'Audit Tools' && userRole === 'admin' && (
                  <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>Audit Checklist:</h4>
                      
                      <div style={{ ...adminWireframeDataCanvasStyle, height: '300px', position: 'relative', overflow: 'hidden' }}>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500', zIndex: '5' }}>Audit Verification Checklist Streams Workspace</span>
                        <div style={{ position: 'absolute', inset: 0, opacity: '0.02', pointerEvents: 'none', background: 'linear-gradient(135deg, transparent 49.5%, #fff 49.5%, #fff 50.5%, transparent 50.5%), linear-gradient(45deg, transparent 49.5%, #fff 49.5%, #fff 50.5%, transparent 50.5%)' }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                      <button type="submit" style={gradientExecuteButtonStyle}>
                        Update Changes
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* --- TAB OPTION 3: INTEGRATED ADMIN PANEL LAYER --- */}
          {profileTargetTab === 'Admin Panel' && userRole === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                {['Users', 'Dept', 'Roles', 'ISO Module'].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setAdminPillTab(pill)}
                    style={{
                      ...pillTabButtonStyle,
                      background: adminPillTab === pill ? '#000000' : 'rgba(255, 255, 255, 0.05)',
                      color: adminPillTab === pill ? '#ffffff' : '#cbd5e1',
                      borderColor: adminPillTab === pill ? '#ffffff' : 'rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%' }}>
                <div style={{ minWidth: '160px' }}>
                  <select style={adminSelectInputStyle}>
                    <option>Filter by Dept:</option>
                    <option>Quality Assurance</option>
                    <option>Operations</option>
                  </select>
                </div>

                <div style={{ flex: '1', position: 'relative', maxWidth: '380px' }}>
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search context items..."
                    style={adminSearchInputStyle}
                  />
                  <Search size={14} style={{ position: 'absolute', right: '12px', top: '11px', color: '#64748b' }} />
                </div>

                <button type="button" onClick={() => setIsAddModalOpen(true)} style={adminAddUsersButtonStyle}>
                  <Plus size={14} style={{ marginRight: '4px' }} /> 
                  {getActionButtonLabel()}
                </button>
              </div>

              <div style={adminWireframeDataCanvasStyle}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                  {adminPillTab} Management Subsystem Canvas Ledger Window
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- UNIFIED MULTI-FORM ACTION MODULE MODAL OVERLAY --- */}
      <AdminCreationModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        formContext={adminPillTab} 
        userData={newUser}
        setUserData={setNewUser}
        departmentName={departmentName}
        setDepartmentName={setDepartmentName}
        rolePositionName={rolePositionName}
        setRolePositionName={setRolePositionName}
        selectedIsoModule={selectedIsoModule}
        setSelectedIsoModule={setSelectedIsoModule}
      />
    </div>
  );
}

// --- DYNAMIC CONTEXTUAL ADMIN MODAL COMPONENT WINDOW ---
function AdminCreationModal({ 
  isOpen, 
  onClose, 
  formContext, 
  userData, 
  setUserData, 
  departmentName, 
  setDepartmentName,
  rolePositionName,
  setRolePositionName,
  selectedIsoModule,
  setSelectedIsoModule
}) {
  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (formContext === 'Dept') setDepartmentName('');
    if (formContext === 'Roles') setRolePositionName(''); 
    if (formContext === 'ISO Module') setSelectedIsoModule(''); 
    onClose();
  };

  const getFormWidth = () => {
    if (formContext === 'Dept' || formContext === 'Roles' || formContext === 'ISO Module') return '540px';
    return '720px';
  };

  return (
    <div style={adminOverlayStyle}>
      <div style={{ ...adminCardStyle, maxWidth: getFormWidth(), padding: '32px', color: '#f8fafc', transition: 'max-width 0.2s ease-in-out' }}>
        
        <button type="button" onClick={onClose} style={adminCloseButtonStyle}>✕</button>
        
        <div style={{ textAlign: 'left', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>
            {formContext === 'Dept' ? 'Add Department' : formContext === 'Roles' ? 'Add Roles' : formContext === 'ISO Module' ? 'Add ISO Module' : 'Add Users'}
          </h3>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: 0, textAlign: 'left' }}>
          
          {formContext === 'Dept' && (
            <div style={{ animation: 'fadeIn 0.15s ease-out' }}>
              <label style={modalFormLabelStyle}>Department Name:</label>
              <input type="text" required value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} style={modalFormInputStyle} placeholder="Enter new department name..." />
            </div>
          )}

          {formContext === 'Roles' && (
            <div style={{ animation: 'fadeIn 0.15s ease-out' }}>
              <label style={modalFormLabelStyle}>Position:</label>
              <input type="text" required value={rolePositionName} onChange={(e) => setRolePositionName(e.target.value)} style={modalFormInputStyle} placeholder="Enter new position role..." />
            </div>
          )}

          {formContext === 'ISO Module' && (
            <div style={{ animation: 'fadeIn 0.15s ease-out' }}>
              <label style={modalFormLabelStyle}>ISO Module:</label>
              <select required value={selectedIsoModule} onChange={(e) => setSelectedIsoModule(e.target.value)} style={modalFormSelectStyle}>
                <option value="" disabled hidden></option> 
                <option value="9001">ISO 9001:2015 (Quality Management)</option>
                <option value="14001">ISO 14001:2015 (Environmental Management)</option>
                <option value="45001">ISO 45001:2018 (Occupational Health & Safety)</option>
              </select>
            </div>
          )}

          {formContext !== 'Dept' && formContext !== 'Roles' && formContext !== 'ISO Module' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.15s ease-out' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div><label style={modalFormLabelStyle}>First Name:</label><input type="text" value={userData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} style={modalFormInputStyle} /></div>
                <div><label style={modalFormLabelStyle}>Middle Name:</label><input type="text" value={userData.middleName} onChange={(e) => handleInputChange('middleName', e.target.value)} style={modalFormInputStyle} /></div>
                <div><label style={modalFormLabelStyle}>Last Name:</label><input type="text" value={userData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} style={modalFormInputStyle} /></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div><label style={modalFormLabelStyle}>Email Address:</label><input type="email" value={userData.email} onChange={(e) => handleInputChange('email', e.target.value)} style={modalFormInputStyle} /></div>
                <div><label style={modalFormLabelStyle}>Username:</label><input type="text" value={userData.username} onChange={(e) => handleInputChange('username', e.target.value)} style={modalFormInputStyle} /></div>
                <div><label style={modalFormLabelStyle}>Contact No.:</label><input type="text" value={userData.contactNo} onChange={(e) => handleInputChange('contactNo', e.target.value)} style={modalFormInputStyle} /></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={modalFormLabelStyle}>Department:</label>
                  <select value={userData.department} onChange={(e) => handleInputChange('department', e.target.value)} style={modalFormSelectStyle}>
                    <option value="">Select Department</option>
                    <option value="QA">Quality Assurance</option>
                    <option value="Operations">Operations & Assembly</option>
                  </select>
                </div>
                <div>
                  <label style={modalFormLabelStyle}>Position:</label>
                  <select value={userData.position} onChange={(e) => handleInputChange('position', e.target.value)} style={modalFormSelectStyle}>
                    <option value="">Select Position</option>
                    <option value="Manager">QA Manager</option>
                    <option value="Inspector">Quality Inspector</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
            <button type="submit" style={modalSubmitButtonBlockStyle}>
              {formContext === 'Dept' ? 'Add Department' : formContext === 'Roles' ? 'Add Role' : formContext === 'ISO Module' ? 'Add Module' : 'Add User'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

// --- AUDIT TOOLS MODAL ---
function AuditToolsModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div style={adminOverlayStyle}>
      <div style={{ ...adminCardStyle, maxWidth: '900px' }}>
        <button onClick={onClose} style={adminCloseButtonStyle}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
          <FileSpreadsheet size={20} style={{ color: '#f472b6' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>System Tracking Audit Tools</h3>
        </div>
        <div style={innerWireframeFrameStyle}>
          <span style={{ fontSize: '12px', color: '#475569' }}>Non-Conformance Log Verification Streams Ledger</span>
        </div>
      </div>
    </div>
  )
}

// --- FULLY RESTORED DYNAMIC AUTO-RESIZING NOTIFICATIONS MODAL ---
function NotificationsModal({ isOpen, onClose }) {
  const [viewMode, setViewMode] = useState('list'); 
  const [verifyDetails, setVerifyDetails] = useState('');
  const [activeExplorerTab, setActiveExplorerTab] = useState('Download');

  if (!isOpen) return null;

  const handleCloseDismiss = () => { setViewMode('list'); onClose(); };
  const mediaGridPlaceholders = Array.from({ length: 18 }, (_, index) => index);
  const getModalWidth = () => {
    switch (viewMode) {
      case 'list': return '540px';
      case 'detail': return '820px';
      case 'verify': return '640px';
      case 'upload': return '880px';
      default: return '540px';
    }
  };

  return (
    <div style={adminOverlayStyle}>
      <div style={{ ...adminCardStyle, maxWidth: getModalWidth(), padding: viewMode === 'upload' ? '0' : '32px', color: '#f8fafc', overflow: 'hidden', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {viewMode !== 'upload' && (
          <>
            <button type="button" onClick={handleCloseDismiss} style={adminCloseButtonStyle}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '16px' }}>
              {viewMode === 'detail' ? (<button onClick={() => setViewMode('list')} style={backLinkButtonStyle}><ArrowLeft size={16} /> Back to Notifications</button>) : viewMode === 'verify' ? (<button onClick={() => setViewMode('detail')} style={backLinkButtonStyle}><ArrowLeft size={16} /> Back to Request Details</button>) : (<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Bell size={18} style={{ color: '#22d3ee' }} /><h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Notifications</h3></div>)}
            </div>
          </>
        )}

        {viewMode === 'list' && (
          <div onClick={() => setViewMode('detail')} style={{ background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '8px', padding: '18px', display: 'flex', gap: '14px', alignItems: 'flex-start', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)'}>
            <AlertCircle size={18} style={{ color: '#22d3ee', marginTop: '2px', minWidth: '18px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}><h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>Verification Action Required:</h4><p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>Review closed discrepancies validation metrics. Please verify the effectiveness of the corrective action for this complaint.</p></div>
          </div>
        )}

        {viewMode === 'detail' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.05)', borderLeft: '3px solid #06b6d4', padding: '14px 16px', borderRadius: '4px', textAlign: 'left' }}><h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>Verification Action Required:</h4><p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>Review closed discrepancies validation metrics to close the compliance loop cycle.</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={detailWindowBlockStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', textAlign: 'left' }}><div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={14} style={{ color: '#22d3ee' }} /></div><div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>Quality Inspector</span><span style={{ fontSize: '9px', color: '#64748b' }}>QA Department • Active Discrepancy</span></div></div>
                <div style={innerWireframeFrameStyle}><span style={{ fontSize: '12px', color: '#475569' }}>Evidence & Action Artifacts</span></div>
              </div>
              <div style={detailWindowBlockStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}><span style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>Evaluation Status</span><span style={{ fontSize: '9px', color: '#64748b' }}>Pending Close Signature</span></div><button onClick={() => setViewMode('verify')} style={verifyTriggerButtonStyle}>Verify Effectiveness</button></div>
                <div style={innerWireframeFrameStyle}><span style={{ fontSize: '12px', color: '#475569' }}>Corrective Analysis Canvas</span></div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'verify' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div><label style={formLabelStyle}>Evidence:</label><div onClick={() => setViewMode('upload')} style={{ border: '2px dashed rgba(6, 182, 212, 0.3)', background: 'rgba(8, 18, 35, 0.4)', borderRadius: '8px', padding: '24px 20px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}><Upload size={20} style={{ color: '#06b6d4' }} /><span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '500' }}>Upload verification capture image</span></div></div>
            <div><label style={formLabelStyle}>Closing Evaluation Summary Logs:</label><textarea value={verifyDetails} onChange={(e) => setVerifyDetails(e.target.value)} style={formTextareaStyle} placeholder="Provide comprehensive summary logs validating corrective measure closure effectiveness metrics..." /></div>
            <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}><button type="button" onClick={handleCloseDismiss} style={gradientExecuteButtonStyle}>Verify Effectiveness</button></div>
          </div>
        )}

        {viewMode === 'upload' && (
          <div style={{ display: 'flex', height: '520px', width: '100%', position: 'relative' }}>
            <button type="button" onClick={() => setViewMode('verify')} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', zIndex: '50' }}>✕</button>
            <div style={{ width: '180px', background: 'rgba(8, 18, 35, 0.4)', borderRight: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}><h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#22d3ee', textAlign: 'left' }}>Location</h4><button type="button" onClick={() => setActiveExplorerTab('Download')} style={{ ...explorerTabButtonStyle, background: activeExplorerTab === 'Download' ? 'rgba(6, 182, 212, 0.12)' : 'transparent', color: activeExplorerTab === 'Download' ? '#22d3ee' : '#94a3b8' }}><Folder size={14} /> Download</button><button type="button" onClick={() => setActiveExplorerTab('Pictures')} style={{ ...explorerTabButtonStyle, background: activeExplorerTab === 'Pictures' ? 'rgba(6, 182, 212, 0.12)' : 'transparent', color: activeExplorerTab === 'Pictures' ? '#22d3ee' : '#94a3b8' }}><ImageIcon size={14} /> Pictures</button></div>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              <div style={{ padding: '24px 24px 12px 24px', textAlign: 'left' }}><h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>{activeExplorerTab}</h3></div>
              <div style={{ flex: '1', padding: '0 24px 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', overflowY: 'auto', boxSizing: 'border-box' }}>{mediaGridPlaceholders.map((item) => (<div key={item} style={{ aspectRatio: '1', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={16} style={{ color: '#334155' }} /></div>))}</div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(8, 18, 35, 0.2)', display: 'flex', justifyContent: 'flex-end', gap: '12px', boxSizing: 'border-box' }}><button type="button" onClick={() => setViewMode('verify')} style={explorerFooterCancelButtonStyle}>Cancel</button><button type="button" onClick={() => setViewMode('verify')} style={explorerFooterUploadButtonStyle}>Select Media</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- LAYOUT DESIGN SYSTEM ATOM VARIABLES ---
const navTabStyle = { background: 'none', border: 'none', color: '#94a3b8', padding: '6px 12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' };
const tabToggleStyle = { padding: '12px 24px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: '1px solid rgba(255, 255, 255, 0.12)', borderBottom: 'none', borderRadius: '8px 8px 0 0', transition: 'all 0.2s ease' };
const sideTabStyle = { width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', transition: 'all 0.2s' };
const fieldRowStyle = { display: 'flex', alignItems: 'center', gap: '16px' };
const fieldIconStyle = { color: '#64748b', minWidth: '16px' };
const fieldLabelStyle = { width: '160px', fontSize: '13px', color: '#94a3b8' };
const fieldValueStyle = { flex: '1', fontSize: '13px', color: '#f1f5f9', fontWeight: '500' };
const subLabelStyle = { display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' };
const subInputStyle = { width: '100%', height: '36px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' };
const adminOverlayStyle = { position: 'fixed', inset: 0, zIndex: '2000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4, 9, 20, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' };
const adminCardStyle = { width: '90%', background: 'rgba(13, 26, 45, 0.98)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '32px', position: 'relative', boxSizing: 'border-box', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' };
const adminCloseButtonStyle = { position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' };
const innerWireframeFrameStyle = { width: '100%', height: '200px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const gradientExecuteButtonStyle = { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', color: 'white', padding: '12px 48px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.25)' };

const pillTabButtonStyle = { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s ease' };
const adminSelectInputStyle = { width: '100%', height: '36px', background: '#ffffff', border: '1px solid #737373', borderRadius: '4px', padding: '0 8px', fontSize: '12px', color: '#000000', outline: 'none', cursor: 'pointer' };
const adminSearchInputStyle = { width: '100%', height: '36px', background: '#ffffff', border: '1px solid #737373', borderRadius: '4px', padding: '0 36px 0 12px', fontSize: '12px', color: '#000000', outline: 'none', boxSizing: 'border-box' };
const adminAddUsersButtonStyle = { background: '#737373', border: 'none', color: '#ffffff', height: '36px', padding: '0 16px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 'auto' };
const adminWireframeDataCanvasStyle = { width: '100%', height: '320px', background: 'rgba(8, 18, 35, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const modalFormLabelStyle = { display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px', textAlign: 'left' };
const modalFormInputStyle = { width: '100%', height: '38px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' };
const modalFormSelectStyle = { ...modalFormInputStyle, cursor: 'pointer', colorScheme: 'dark', padding: '0 8px' };
const modalSubmitButtonBlockStyle = { background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#ffffff', padding: '10px 48px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' };

const detailWindowBlockStyle = { flex: '1', background: 'rgba(8, 18, 35, 0.35)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' };
const verifyTriggerButtonStyle = { background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#22d3ee', fontSize: '11px', fontWeight: '600', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' };
const formLabelStyle = { display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px', textAlign: 'left' };
const formTextareaStyle = { width: '100%', height: '120px', background: 'rgba(8, 18, 35, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', resize: 'none', boxSizing: 'border-box' };
const backLinkButtonStyle = { background: 'none', border: 'none', color: '#22d3ee', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '0' };
const explorerTabButtonStyle = { width: '100%', border: 'none', textAlign: 'left', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const explorerFooterCancelButtonStyle = { background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' };
const explorerFooterUploadButtonStyle = { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', color: 'white', padding: '8px 24px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };