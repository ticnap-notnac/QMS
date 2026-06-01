import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { supabase } from './utils/supabase'
import Login from './components/Login.jsx'
import IntroModal from './components/Modals/IntroModal.jsx'
import NotificationsModal from './components/NotificationsModal.jsx'
import { fetchUnreadNotificationCount } from '@/services/notificationService'
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
import ISOStandardsPage from './pages/ISOStandardsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AuditToolsPage from './pages/AuditToolsPage.jsx'
import { LookupProvider } from './context/LookupContext'
import { logAction } from '@/services/logService'

function normalizeRoleValue(value) {
  return String(value || '').trim().toLowerCase()
}

export default function App() {
  const [showIntro, setShowIntro] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [userRole, setUserRole] = useState('user')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [userName, setUserName] = useState('Name of the User')
  const [userPosition, setUserPosition] = useState('Position')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [activePage, setActivePage] = useState('Dashboard')
  const [profileTargetTab, setProfileTargetTab] = useState('User Information')

  const canViewNotifications = Boolean(user)

  // Initialization: Auth state listener
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await refreshUserData(session.user)
      }
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setCurrentUserId(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const applyUserRoleData = async (profile) => {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    const displayName = fullName || profile.user_name || profile.email || 'Name of the User'
    setUserName(displayName)

    let resolvedRoleName = null
    if (profile.role_id) {
      const { data: roleData } = await supabase.from('roles').select('role_name').eq('id', profile.role_id).maybeSingle()
      if (roleData?.role_name) {
        resolvedRoleName = roleData.role_name
        setUserPosition(resolvedRoleName)
        setUserRole(resolvedRoleName.toLowerCase() === 'admin' ? 'admin' : resolvedRoleName.toLowerCase())
      }
    }
  }


  const refreshUserData = async (authUser) => {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, user_name, role_id, status')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (data) {
      if (String(data.status).toUpperCase() === 'DEACTIVATED') {
        await supabase.auth.signOut()
        setUser(null)
        return
      }
      setCurrentUserId(data.id || null)
      await applyUserRoleData(data)
    }
  }

  const refreshUnreadNotificationCount = useCallback(async () => {
    if (!currentUserId || !user) {
      setUnreadNotificationCount(0)
      return
    }
    const count = await fetchUnreadNotificationCount(currentUserId)
    setUnreadNotificationCount(count)
  }, [currentUserId, user])

  useEffect(() => {
    if (user) refreshUnreadNotificationCount()
  }, [user, refreshUnreadNotificationCount])

  const handleSubmit = async (authData) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_name, role_id, status')
        .eq('auth_id', authData.user.id)
        .maybeSingle()

      if (data && String(data.status).toUpperCase() === 'DEACTIVATED') {
        await supabase.auth.signOut()
        throw new Error('Your account has been deactivated. Please contact an administrator.')
      }
      setUser(authData.user)
      await refreshUserData(authData.user)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await logAction({ level: 'audit', source: 'auth', action: 'user_logout_success' })
    await supabase.auth.signOut()
    setUser(null)
  }

  const renderPage = () => {
    const sharedProps = { activePage, onPageChange: setActivePage, isUserMenuOpen, onToggleMenu: () => setIsUserMenuOpen(!isUserMenuOpen), onLogout: handleLogout, isNotificationsOpen, onToggleNotifications: () => setIsNotificationsOpen(!isNotificationsOpen), userRole, userName, userPosition, currentUserId, unreadNotificationCount, canViewNotifications, authUserId: user?.id || '', profileTargetTab, setProfileTargetTab }

    const pages = {
      'Reports': ReportsPage, 'ISO': ISOPage, 'DCC': DCCPage, 'Profile': UserInformationPage,
      'Admin Panel': AddUserPage, 'Roles': RolesPage, 'Departments': DepartmentsPage,
      'Locations': LocationsPage, 'Product Types': ProductTypesPage, 'ISO Standards': ISOStandardsPage,
      'Settings': SettingsPage, 'Audit Tools': AuditToolsPage
    }

    const Component = pages[activePage] || DashboardPage
    return <Component {...sharedProps} onProfileUpdate={() => refreshUserData(user)} />
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>

  return (
    <LookupProvider>
      <div className="page">
        <div className="bg-orb bg-orb--one"></div>
        <div className="bg-orb bg-orb--two"></div>
        {!user && (
          <header className="brand">
            <div className="logo"><span className="logo-mark">Q</span><span className="logo-text">Flow</span></div>
            <p className="brand-subtitle">QUALITY MANAGEMENT SYSTEM</p>
          </header>
        )}
        {user ? renderPage() : <Login onSubmit={handleSubmit} onLearnMore={() => setShowIntro(true)} />}
        <IntroModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} currentUserId={currentUserId} onRefreshUnreadCount={refreshUnreadNotificationCount} />
      </div>
    </LookupProvider>
  )
}