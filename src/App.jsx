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
import LocationsPage from './pages/LocationsPage.jsx'
import ProductTypesPage from './pages/ProductTypesPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AuditToolsPage from './pages/AuditToolsPage.jsx'
import ISOStandardsPage from './pages/ISOStandardsPage.jsx'
import { LookupProvider } from './context/LookupContext'
import { insertLog } from '@/services/logService'

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

    const activityTimers = {
      expiry: null,
      warning: null,
    }

    // 30 minutes inactivity, warn 2 minutes before expiry
    const TIMEOUT_MS = 30 * 60 * 1000
    const WARNING_MS = 2 * 60 * 1000

    const clearActivityTimers = () => {
      clearTimeout(activityTimers.expiry)
      clearTimeout(activityTimers.warning)
      activityTimers.expiry = null
      activityTimers.warning = null
    }

    const startActivityTimers = async () => {
      clearActivityTimers()
      activityTimers.warning = setTimeout(async () => {
        try {
          const keep = window.confirm('You have been inactive. Stay signed in for another 2 minutes?')
          if (keep) {
            // user chose to stay signed in: reset timers
            startActivityTimers()
          } else {
            await handleLogout()
          }
        } catch (err) {
          console.error('Warning dialog error:', err)
        }
      }, TIMEOUT_MS - WARNING_MS)

      activityTimers.expiry = setTimeout(async () => {
        try {
          await handleLogout()
        } catch (err) {
          console.error('Auto-logout error:', err)
        }
      }, TIMEOUT_MS)
    }

    const resetActivity = () => {
      // ignore rapid-fire events
      startActivityTimers()
    }

    const addActivityListeners = () => {
      window.addEventListener('mousemove', resetActivity)
      window.addEventListener('keydown', resetActivity)
      window.addEventListener('click', resetActivity)
      window.addEventListener('scroll', resetActivity)
    }

    const removeActivityListeners = () => {
      window.removeEventListener('mousemove', resetActivity)
      window.removeEventListener('keydown', resetActivity)
      window.removeEventListener('click', resetActivity)
      window.removeEventListener('scroll', resetActivity)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)

      if (event === 'SIGNED_IN' && session?.user?.id) {
        try {
          // Only log the first login per browser session
          if (!sessionStorage.getItem('login_logged')) {
            await insertLog({
              level: 'audit',
              source: 'auth',
              action: 'user_login',
              userAuthId: session.user.id,
              details: {
                event: 'auth_state_signed_in',
                email: session.user.email || null,
              },
            })
            sessionStorage.setItem('login_logged', 'true')
          }
        } catch (err) {
          console.warn('Failed to log SIGNED_IN event:', err?.message || err)
        }

        // start inactivity timers and listeners
        addActivityListeners()
        startActivityTimers()
      }

      if (event === 'SIGNED_OUT') {
        // clear the per-session login flag on sign out
        try {
          sessionStorage.removeItem('login_logged')
        } catch (e) {
          /* ignore */
        }
        clearActivityTimers()
        removeActivityListeners()
      }
    })

    // If the app started with an active session (user already signed in), start timers/listeners
    ;(async () => {
      try {
        const { data: { user: existingUser } } = await supabase.auth.getUser()
        if (existingUser) {
          addActivityListeners()
          startActivityTimers()
        }
      } catch (err) {
        // ignore
      }
    })()

    return () => {
      subscription?.unsubscribe()
      clearActivityTimers()
      removeActivityListeners()
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
      if (user?.id) {
        try {
          await insertLog({
            level: 'audit',
            source: 'auth',
            action: 'user_logout',
            userAuthId: user.id,
            details: {
              event: 'explicit_logout',
              email: user.email || null,
            },
          })
        } catch (err) {
          console.warn('Failed to write logout log:', err?.message || err)
        }
      }

      try {
        // clear the per-session login flag when user explicitly logs out
        sessionStorage.removeItem('login_logged')
      } catch (e) {
        /* ignore */
      }

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
    if (activePage === 'Locations') {
      return <LocationsPage {...sharedProps} />
    }
    if (activePage === 'Product Types') {
      return <ProductTypesPage {...sharedProps} />
    }
    if (activePage === 'ISO Standards') {
      return <ISOStandardsPage {...sharedProps} />
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
