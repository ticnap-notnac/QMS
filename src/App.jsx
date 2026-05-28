import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './utils/supabase'
import Login from './components/Login.jsx'
import IntroModal from './components/IntroModal.jsx'
import NotificationsModal from './components/NotificationsModal.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ISOPage from './pages/ISOPage.jsx'
import DCCPage from './pages/DCCPage.jsx'
import UserInformationPage from './pages/UserInformationPage.jsx'
import AddUserPage from './pages/AddUserPage.jsx'
import RolesPage from './pages/RolesPage.jsx'
import DepartmentsPage from './pages/DepartmentsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AuditToolsPage from './pages/AuditToolsPage.jsx'
import { LookupProvider } from './context/LookupContext'

export default function App() {
  const [showIntro, setShowIntro] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [userRole, setUserRole] = useState('user')
  const [userName, setUserName] = useState('Name of the User')
  const [userPosition, setUserPosition] = useState('Position')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')
  const [profileTargetTab, setProfileTargetTab] = useState('User Information')

  const applyUserRoleData = async (profile) => {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    // Prefer full name for display (first + last). Fall back to username, then email.
    const displayName = fullName || profile.user_name || profile.email || 'Name of the User'
    setUserName(displayName)

    let resolvedRoleName = null

    if (profile.role_id) {
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', profile.role_id)
          .maybeSingle()

        if (roleError) {
          console.error('Role query error:', roleError)
        } else if (roleData && roleData.role_name) {
          resolvedRoleName = roleData.role_name
          // Display the role name as-is (capitalization preserved) for the UI
          setUserPosition(resolvedRoleName)
          const normalized = resolvedRoleName.toLowerCase()
          setUserRole(normalized === 'admin' ? 'admin' : normalized)
        }
      } catch (err) {
        console.error('Role fetch error:', err)
      }
    }

    // Fallbacks when role couldn't be resolved from roles table
    if (!resolvedRoleName) {
      // use profile.user_name or a generic Position label
      setUserPosition(profile.user_name || 'Position')
      // detect admin heuristically from username if needed
      if (profile.user_name && profile.user_name.toLowerCase().includes('admin')) {
        setUserRole('admin')
      }
    }
  }

  // Debug useEffect to monitor userRole changes
  useEffect(() => {
    console.log('Current userRole:', userRole)
    console.log('Navbar should show Admin Panel button:', userRole === 'admin')
  }, [userRole])

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('first_name, last_name, user_name, role_id')
            .eq('auth_id', user.id)
            .maybeSingle()
          
          if (data) {
            await applyUserRoleData(data)
          }
        }
      } catch (err) {
        console.error('Error checking user:', err)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const handleSubmit = async (authData) => {
    try {
      if (authData && authData.user) {
        console.log('handleSubmit called with user:', authData.user.email)
        setUser(authData.user)
        setError('')
        
        const { data, error } = await supabase
          .from('users')
          .select('first_name, last_name, user_name, role_id')
          .eq('auth_id', authData.user.id)
          .maybeSingle()
        
        console.log('User fetch result:', { data, error })
        
        if (data) {
          await applyUserRoleData(data)
        }
      }
    } catch (err) {
      setError(err.message)
      console.error('Submit error:', err)
    }
  }

  const refreshUserData = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('first_name, last_name, user_name, role_id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (data) {
      await applyUserRoleData(data)
    }
  }
}
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserRole('user')
      setIsUserMenuOpen(false)
      setActivePage('Dashboard')
      setError('')
    } catch (err) {
      setError(err.message)
      console.error('Logout error:', err)
    }
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
      userName,
      userPosition,
      authUserId: user?.id || '',
      profileTargetTab,
      setProfileTargetTab,
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
    if (activePage === 'Profile') {
      return <UserInformationPage {...sharedProps} />
    }
    if (activePage === 'Admin Panel') {
      return <AddUserPage {...sharedProps} />
    }
    if (activePage === 'Roles') {
      return <RolesPage {...sharedProps} />
    }
    if (activePage === 'Departments') {
      return <DepartmentsPage {...sharedProps} />
    }
    if (activePage === 'Settings') {
      return <SettingsPage {...sharedProps} onProfileUpdate={refreshUserData} />
    }
    if (activePage === 'Audit Tools') {
      return <AuditToolsPage {...sharedProps} />
    }
    return <DashboardPage {...sharedProps} />
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px' }}>Loading...</div>
  }

  // Debug: Log current user role and info
  if (user) {
    console.log('Rendering App - User:', user.email, 'Role:', userRole, 'IsAdmin:', userRole === 'admin')
  }

  return (
    <LookupProvider>
      <div className="page">
      <div className="bg-orb bg-orb--one" aria-hidden="true"></div>
      <div className="bg-orb bg-orb--two" aria-hidden="true"></div>

      {!user ? (
        <header className="brand">
          <div className="logo">
            <span className="logo-mark">Q</span>
            <span className="logo-text">Flow</span>
          </div>
          <p className="brand-subtitle">QUALITY MANAGEMENT SYSTEM</p>
        </header>
      ) : null}

      {user ? renderPage() : (
        <Login
          onSubmit={handleSubmit}
          onLearnMore={() => setShowIntro(true)}
        />
      )}

        <IntroModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      </div>
    </LookupProvider>
  )
}
