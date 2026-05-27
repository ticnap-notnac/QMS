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
import AdminPanelPage from './pages/AdminPanelPage.jsx'

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
            .eq('email', user.email)
            .maybeSingle()
          
          if (data) {
            const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim()
            setUserName(fullName || 'Name of the User')
            const position = data.user_name || 'Position'
            setUserPosition(position)
            
            if (position && position.toLowerCase().includes('admin')) {
              console.log('Detected admin in user_name position, setting userRole to admin')
              setUserRole('admin')
            }
            
            // Fetch role from roles table based on role_id
            if (data.role_id) {
              console.log('Fetching role for role_id:', data.role_id, 'Type:', typeof data.role_id)
              
              try {
                const { data: roleData, error: roleError } = await supabase
                  .from('roles')
                  .select('role_name')
                  .eq('id', data.role_id)
                  .maybeSingle()
                
                console.log('Role query - data:', roleData, 'error:', roleError)
                
                if (roleError) {
                  console.error('Role query error:', roleError)
                } else if (roleData && roleData.role_name) {
                  const roleName = roleData.role_name.toLowerCase()
                  console.log('Setting role to:', roleName, 'from:', roleData.role_name)
                  setUserRole(roleName)
                } else {
                  console.log('Role data empty or no role_name:', roleData)
                  // Try alternative: query all roles to see what's available
                  const { data: allRoles } = await supabase.from('roles').select('id, role_name')
                  console.log('Available roles:', allRoles)
                }
              } catch (err) {
                console.error('Role fetch error:', err)
              }
            } else {
              console.log('No role_id for user:', data.email || 'unknown')
            }
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
          .eq('email', authData.user.email)
          .maybeSingle()
        
        console.log('User fetch result:', { data, error })
        
        if (data) {
          const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim()
          console.log('Setting userName to:', fullName)
          setUserName(fullName || 'Name of the User')
          const position = data.user_name || 'Position'
          console.log('Setting userPosition to:', position)
          setUserPosition(position)
          
          // If position contains 'admin', also set userRole to admin
          if (position && position.toLowerCase().includes('admin')) {
            console.log('Detected admin in user_name position, setting userRole to admin')
            setUserRole('admin')
          }
          
          // Fetch role from roles table based on role_id
          if (data.role_id) {
            console.log('Fetching role for role_id:', data.role_id, 'Type:', typeof data.role_id)
            
            try {
              const { data: roleData, error: roleError } = await supabase
                .from('roles')
                .select('role_name')
                .eq('id', data.role_id)
                .maybeSingle()
              
              console.log('Role query - data:', roleData, 'error:', roleError)
              
              if (roleError) {
                console.error('Role query error:', roleError)
              } else if (roleData && roleData.role_name) {
                const roleName = roleData.role_name.toLowerCase()
                console.log('Setting role to:', roleName, 'from:', roleData.role_name)
                setUserRole(roleName)
              } else {
                console.log('Role data empty or no role_name:', roleData)
                // Try alternative: query all roles to see what's available
                const { data: allRoles } = await supabase.from('roles').select('id, role_name')
                console.log('Available roles:', allRoles)
              }
            } catch (err) {
              console.error('Role fetch error:', err)
            }
          } else {
            console.log('No role_id for user:', data.email || 'unknown')
          }
        }
      }
    } catch (err) {
      setError(err.message)
      console.error('Submit error:', err)
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
      return <AdminPanelPage {...sharedProps} />
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
  )
}
