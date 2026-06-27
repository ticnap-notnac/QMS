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
import ConfirmDialog from './components/Modals/ConfirmDialog.jsx'
import Toast from './components/UI/Toast.jsx'
import { friendlyError } from './utils/friendlyError.js'

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

  const applyUserRoleData = async (profile) => {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    // Prefer full name for display (first + last). Fall back to username, then email.
    const displayName = fullName || profile.user_name || profile.email || 'Name of the User'
    setUserName(displayName)
    setUserDepartmentId(profile.department_id || null)

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

    if (profile.role && !resolvedRoleName) {
      resolvedRoleName = profile.role
      setUserPosition(profile.role)
      setUserRole(normalizeRoleValue(profile.role))
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

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_name, role_id, department_id')
            .eq('auth_id', user.id)
            .maybeSingle()

          if (data) {
            setCurrentUserId(data.id || null)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user || null
      setUser(newUser)

      if (newUser) {
        try {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_name, role_id, department_id')
            .eq('auth_id', newUser.id)
            .maybeSingle()

          if (data) {
            setCurrentUserId(data.id || null)
            await applyUserRoleData(data)
          }
        } catch (err) {
          console.error('Error fetching user data on auth state change:', err)
        }
      } else {
        setCurrentUserId(null)
        setUserName('Name of the User')
        setUserPosition('Position')
        setUserRole('user')
      }
    })

    return () => {
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
        setError('')
        
        try {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_name, role_id, department_id')
            .eq('auth_id', authData.user.id)
            .maybeSingle()

          if (data) {
            setCurrentUserId(data.id || null)
            await applyUserRoleData(data)
          }
        } catch (err) {
          console.error('Error fetching user data on login:', err)
        }

        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, user_name, role_id, department_id')
          .eq('auth_id', authData.user.id)
          .maybeSingle()

        if (data) {
          setCurrentUserId(data.id || null)
          await applyUserRoleData(data)
        }
        navigate('/')
      }
    } catch (err) {
      setError(friendlyError(err, 'Your session could not be loaded. Please refresh the page or log in again.'))
      console.error('Submit error:', err)
    }
  }

  const refreshUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_name, role_id, department_id')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (data) {
        setCurrentUserId(data.id || null)
        await applyUserRoleData(data)
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
    
    if (isVerificationDateUp) {
      navigate(`/reports?openRating=${reportId}`)
    } else if (isAuditScheduled) {
      navigate('/audit-tools?tab=Schedules')
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
            <img src="/qflow_logo_transparent.png" alt="QFlow Logo" className="logo-img" />
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

// ─── AppRoot ─────────────────────────────────────────────────────────────────
// Wraps AppInner in LookupProvider so context is available to all children.

export default function App() {
  return (
    <LookupProvider>
      <AppInner />
    </LookupProvider>
  )
}
