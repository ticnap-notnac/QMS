import { useCallback, useEffect, useState, useRef } from 'react'
import './App.css'
import { supabase } from './utils/supabase'
import Login from './components/Auth/Login.jsx'
import IntroModal from './components/Modals/IntroModal.jsx'
import { fetchUnreadNotificationCount } from '@/services/notificationService'
import { LookupProvider, useLookup } from './context/LookupContext'
import { useNavigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout.jsx'
import { logAction } from '@/services/logService'
import { useIdleTimeout } from './hooks/useIdleTimeout'
import Toast from './components/UI/Toast.jsx'
import { friendlyError } from './utils/friendlyError.js'
import { clearCachedAuthId } from './services/authService.js'
import { isAdminRole } from './utils/roleUtils.js'

function normalizeRoleValue(value) {
  return String(value || '').trim().toLowerCase()
}

// ─── AppInner ─────────────────────────────────────────────────────────────────
// Separated from AppRoot so that useLookup() is called *inside* LookupProvider.

function AppInner() {
  const [showIntro, setShowIntro] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [userRole, setUserRole] = useState('user')
  const [userPermissions, setUserPermissions] = useState({ pages: ['dashboard', 'reports', 'dcc', 'settings'], rights: ['create_report'] })
  const [currentUserId, setCurrentUserId] = useState(null)
  const [userDepartmentId, setUserDepartmentId] = useState(null)
  const [userName, setUserName] = useState('Name of the User')
  const [userPosition, setUserPosition] = useState('Position')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [profileTargetTab, setProfileTargetTab] = useState('User Information')
  const canViewNotifications = Boolean(user)
  const navigate = useNavigate()
  const isLoggingOutRef = useRef(false)

  // Pull site context from LookupContext (loaded on auth state change)
  const { userSiteId, userSiteName } = useLookup()

  useEffect(() => {
    console.log('current user:', user)
    console.log('user role:', user?.role)
  }, [user])

  useEffect(() => {
    const highContrast = localStorage.getItem('accessibility-high-contrast') === 'true'
    document.body.classList.toggle('high-contrast-mode', highContrast)

    const textScale = localStorage.getItem('accessibility-text-scale') || 'normal'
    document.documentElement.setAttribute('data-text-scale', textScale)

    const reduceMotion = localStorage.getItem('accessibility-reduce-motion') === 'true'
    document.body.classList.toggle('reduce-motion-mode', reduceMotion)
  }, [])

  const refreshUnreadNotificationCount = useCallback(async () => {
    if (!currentUserId || !user) {
      setUnreadNotificationCount(0)
      return
    }

    try {
      const count = await fetchUnreadNotificationCount(currentUserId)
      setUnreadNotificationCount(count)
    } catch (err) {
      console.error('Error fetching unread notifications:', err)
      setUnreadNotificationCount(0)
    }
  }, [currentUserId, user])

  const applyUserRoleData = (profile) => {
    if (profile.status && String(profile.status).toUpperCase() !== 'ACTIVE') {
      setUser(null)
      setCurrentUserId(null)
      setUserDepartmentId(null)
      clearCachedAuthId()
      supabase.auth.signOut().catch(console.error)
      setToast({ message: 'Your account is deactivated or inactive. Please contact an administrator.', type: 'error' })
      return
    }
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    // Prefer full name for display (first + last). Fall back to username, then email.
    const displayName = fullName || profile.user_name || profile.email || 'Name of the User'
    setUserName(displayName)
    setUserDepartmentId(profile.department_id || null)

    let resolvedRoleName = profile.roles?.role_name || null
    if (profile.roles?.permissions) {
      setUserPermissions(profile.roles.permissions)
    } else {
      const normalized = String(resolvedRoleName || profile.role || '').toLowerCase()
      if (isAdminRole(normalized)) {
        setUserPermissions({
          pages: ['dashboard', 'reports', 'iso', 'dcc', 'audit_tools', 'admin_panel', 'settings'],
          rights: [
            'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
            'accept_decline_report', 'assign_report',
            'create_car_report', 'create_qddr_report', 'create_report',
            'edit_delete_report', 'submit_capa', 'verify_car',
            'manage_iso', 'manage_users', 'manage_roles', 'manage_categories',
            'manage_audit_schedules', 'view_logs'
          ],
        })
      } else if (['auditor', 'qa officer'].includes(normalized)) {
        setUserPermissions({
          pages: ['dashboard', 'reports', 'iso', 'dcc', 'audit_tools', 'settings'],
          rights: [
            'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
            'accept_decline_report', 'assign_report',
            'create_car_report', 'create_qddr_report', 'create_report',
            'submit_capa', 'manage_iso', 'manage_audit_schedules', 'view_logs'
          ],
        })
      } else if (['team leader', 'warehouse executive', 'warehouse supervisor'].includes(normalized)) {
        setUserPermissions({
          pages: ['dashboard', 'reports', 'dcc', 'settings'],
          rights: [
            'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
            'create_car_report', 'create_qddr_report', 'create_report',
            'accept_decline_report', 'assign_report'
          ],
        })
      } else {
        setUserPermissions({
          pages: ['dashboard', 'reports', 'dcc', 'settings'],
          rights: ['view_car_reports', 'view_qddr_reports', 'create_car_report', 'create_qddr_report', 'create_report', 'view_audit_schedules', 'view_audit_reports'],
        })
      }
    }

    const resolvedPositionName = profile.positions?.position_name || profile.position_name || null
    if (resolvedPositionName) {
      setUserPosition(resolvedPositionName)
    } else if (resolvedRoleName) {
      setUserPosition(resolvedRoleName)
    } else if (profile.role) {
      setUserPosition(profile.role)
    } else {
      setUserPosition(profile.user_name || 'Position')
    }

    if (resolvedRoleName) {
      const normalized = resolvedRoleName.toLowerCase()
      setUserRole(normalized === 'admin' ? 'admin' : normalized)
    } else if (profile.role) {
      resolvedRoleName = profile.role
      setUserRole(normalizeRoleValue(profile.role))
    }
  }

  useEffect(() => {
    let active = true
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!active) return
        setUser(user)

        if (user) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_name, role_id, department_id, position_id, status, roles(role_name, permissions), positions(position_name), departments(department_name)')
            .eq('auth_id', user.id)
            .maybeSingle()

          if (active && data) {
            setCurrentUserId(data.id || null)
            applyUserRoleData(data)
          }
        }
      } catch (err) {
        console.error('Error checking user:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return
      const newUser = session?.user || null

      // Only trigger logic if user ID actually changed to prevent loops
      setUser(prevUser => {
        if (prevUser?.id === newUser?.id) return prevUser

        if (newUser) {
          supabase
            .from('users')
            .select('id, first_name, last_name, user_name, role_id, department_id, position_id, status, roles(role_name, permissions), positions(position_name), departments(department_name)')
            .eq('auth_id', newUser.id)
            .maybeSingle()
            .then(({ data }) => {
              if (active && data) {
                setCurrentUserId(data.id || null)
                applyUserRoleData(data)
              }
            })
            .catch(err => console.error('Error fetching user data on auth state change:', err))
        } else {
          setCurrentUserId(null)
          setUserName('Name of the User')
          setUserPosition('Position')
          setUserRole('user')
        }
        return newUser
      })
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      refreshUnreadNotificationCount()
    }
  }, [user, userRole, refreshUnreadNotificationCount])

  const handleSubmit = async (authData) => {
    try {
      if (authData && authData.user) {
        setUser(authData.user)
        setToast(null)

        try {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_name, role_id, department_id, status, roles(role_name, permissions)')
            .eq('auth_id', authData.user.id)
            .maybeSingle()

          if (data) {
            setCurrentUserId(data.id || null)
            applyUserRoleData(data)
          }
        } catch (err) {
          console.error('Error fetching user data on login:', err)
        }

        if (!localStorage.getItem('iso_terms_agreed')) {
          setShowIntro(true)
        }
        navigate('/dashboard')
      }
    } catch (err) {
      setToast({ message: friendlyError(err, 'Your session could not be loaded. Please refresh the page or log in again.'), type: 'error' })
      console.error('Submit error:', err)
    }
  }

  const refreshUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_name, role_id, department_id, status, roles(role_name, permissions)')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (data) {
        setCurrentUserId(data.id || null)
        applyUserRoleData(data)
      }
    }
  }

  const handleLogoutClick = () => {
    setToast({
      message: 'Are you sure you want to log out of your account?',
      type: 'info',
      onConfirm: handleLogout,
      confirmText: 'Log Out',
      cancelText: 'Cancel'
    })
  }

  const handleLogout = async () => {
    setToast(null)
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true
    try {
      const authId = user?.id

      // Optimistically clear UI state for instant feedback
      setUser(null)
      setUserDepartmentId(null)
      setUnreadNotificationCount(0)
      setIsNotificationsOpen(false)

      // Wait for logging to finish before destroying the session
      await logAction({
        level: 'audit',
        source: 'auth',
        action: 'user_logout_success',
        userAuthId: authId,
        details: { event: 'logout_success' },
      }).catch(console.error)

      // Perform actual network signout
      await supabase.auth.signOut()
      clearCachedAuthId()
      setToast({ message: 'You have been successfully logged out.', type: 'success' })
    } catch (err) {
      setToast({ message: friendlyError(err, 'Sign-out failed. Please refresh the page and try again.'), type: 'error' })
      console.error('Logout error:', err)

      await logAction({
        level: 'warn',
        source: 'auth',
        action: 'user_logout_failed',
        details: { event: 'logout_failed', message: err?.message || 'Logout failed' },
      })
    } finally {
      isLoggingOutRef.current = false
    }
  }

  // Auto-logout user after 15 minutes of inactivity
  useIdleTimeout(user, handleLogout, 900000)

  const sharedProps = {
    userRole,
    userPermissions,
    userName,
    userPosition,
    currentUserId,
    userDepartmentId,
    authUserId: user?.id || '',
    profileTargetTab,
    setProfileTargetTab,
    onRefreshUnreadCount: refreshUnreadNotificationCount,
    userSiteId,
    userSiteName,
  }

  const handleNotificationSelect = (reportId, notification = null) => {
    setIsNotificationsOpen(false)
    const isVerificationDateUp = notification?.title && String(notification.title).startsWith('Verification Date Up')
    const isAuditScheduled = notification?.title && String(notification.title).startsWith('Audit Scheduled')
    const isCarVoePending = notification?.title && String(notification.title).startsWith('CAR VoE Pending:')

    if (isVerificationDateUp) {
      navigate(`/reports?openRating=${reportId}`)
    } else if (isAuditScheduled) {
      navigate('/audit-tools?tab=Schedules')
    } else if (isCarVoePending) {
      navigate(`/reports?openCar=${reportId}`)
    } else {
      navigate('/reports')
      if (reportId) {
        window.setTimeout(() => {
          const target = document.getElementById(`report-card-${reportId}`)
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      }
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px' }}>Loading...</div>
  }

  return (
    <div className="page">
      <div className="bg-orb bg-orb--one" aria-hidden="true"></div>
      <div className="bg-orb bg-orb--two" aria-hidden="true"></div>

      {!user ? (
        <header className="brand">
          <div className="logo">
            <img src="/resq_logo_transparent.png" alt="RESQ Logo" className="logo-img" />
          </div>
          <p className="brand-subtitle">QUALITY MANAGEMENT SYSTEM</p>
        </header>
      ) : null}

      {user ? (
        <MainLayout
          isUserMenuOpen={isUserMenuOpen}
          setIsUserMenuOpen={setIsUserMenuOpen}
          handleLogout={handleLogoutClick}
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          userRole={userRole}
          userName={userName}
          userPosition={userPosition}
          userEmail={user?.email}
          currentUserId={currentUserId}
          unreadNotificationCount={unreadNotificationCount}
          canViewNotifications={canViewNotifications}
          setUnreadNotificationCount={setUnreadNotificationCount}
          refreshUnreadNotificationCount={refreshUnreadNotificationCount}
          handleNotificationSelect={handleNotificationSelect}
          setProfileTargetTab={setProfileTargetTab}
          userSiteName={userSiteName}
          sharedProps={sharedProps}
          refreshUserData={refreshUserData}
        />
      ) : (
        <Login
          onSubmit={handleSubmit}
          onLearnMore={() => setShowIntro(true)}
        />
      )}

      <IntroModal isOpen={showIntro} onClose={() => setShowIntro(false)} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onConfirm={toast.onConfirm}
          confirmText={toast.confirmText}
          cancelText={toast.cancelText}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <LookupProvider>
      <AppInner />
    </LookupProvider>
  )
}
