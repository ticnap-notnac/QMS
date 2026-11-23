import { useEffect, useRef } from 'react'

const LAST_ACTIVE_STORAGE_KEY = 'resq_last_active_at'
const STORAGE_WRITE_THROTTLE_MS = 2000

/**
 * Custom hook to monitor user activity and trigger a logout callback
 * when the user has been idle for the specified delay period—including across
 * browser tab closes, page reloads, and computer/mobile sleep states.
 *
 * @param {object|null} user - The current authenticated user object.
 * @param {function} onTimeout - The callback to execute when idle limit is reached.
 * @param {number} delay - Time in milliseconds before timing out (defaults to 15 minutes).
 */
export function useIdleTimeout(user, onTimeout, delay = 900000) {
  const timeoutIdRef = useRef(null)
  const onTimeoutRef = useRef(onTimeout)
  const lastActiveRef = useRef(0)
  const lastStorageWriteRef = useRef(0)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    const userId = user?.id || null

    if (!userId) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
      try {
        localStorage.removeItem(LAST_ACTIVE_STORAGE_KEY)
      } catch {
        // ignore storage errors
      }
      return
    }

    const getStoredLastActive = () => {
      try {
        const raw = localStorage.getItem(LAST_ACTIVE_STORAGE_KEY)
        const parsed = raw ? Number(raw) : 0
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
      } catch {
        return 0
      }
    }

    const persistLastActive = (now, force = false) => {
      lastActiveRef.current = now
      if (force || now - lastStorageWriteRef.current >= STORAGE_WRITE_THROTTLE_MS) {
        lastStorageWriteRef.current = now
        try {
          localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, String(now))
        } catch {
          // ignore storage errors
        }
      }
    }

    const triggerTimeout = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
      try {
        localStorage.removeItem(LAST_ACTIVE_STORAGE_KEY)
      } catch {
        // ignore storage errors
      }
      console.log('[useIdleTimeout] Idle timeout reached. Logging out user.')
      if (typeof onTimeoutRef.current === 'function') {
        onTimeoutRef.current()
      }
    }

    const scheduleTimer = (remainingMs = delay) => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      timeoutIdRef.current = setTimeout(() => {
        const now = Date.now()
        const latestActive = Math.max(lastActiveRef.current, getStoredLastActive())
        const elapsed = latestActive > 0 ? now - latestActive : delay
        if (elapsed >= delay) {
          triggerTimeout()
        } else {
          scheduleTimer(Math.max(delay - elapsed, 1000))
        }
      }, Math.max(remainingMs, 0))
    }

    // Check on mount / page reload whether the stored session already exceeded the idle window
    const nowOnMount = Date.now()
    const storedLastActive = getStoredLastActive()
    if (storedLastActive > 0 && nowOnMount - storedLastActive >= delay) {
      triggerTimeout()
      return
    }

    const initialActive = storedLastActive > 0 ? storedLastActive : nowOnMount
    persistLastActive(initialActive, true)
    scheduleTimer(delay - (nowOnMount - initialActive))

    const handleActivity = () => {
      const now = Date.now()
      const latestActive = Math.max(lastActiveRef.current, getStoredLastActive())

      // If the user returns after the tab was closed/backgrounded or device slept past the timeout, log out immediately
      if (latestActive > 0 && now - latestActive >= delay) {
        triggerTimeout()
        return
      }

      persistLastActive(now, false)
      scheduleTimer(delay)
    }

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        // Flush exact last active timestamp when user leaves/hides the tab
        persistLastActive(lastActiveRef.current || Date.now(), true)
        return
      }
      handleActivity()
    }

    const handleStorageSync = (e) => {
      if (e.key === LAST_ACTIVE_STORAGE_KEY && e.newValue) {
        const syncedVal = Number(e.newValue)
        if (Number.isFinite(syncedVal) && syncedVal > lastActiveRef.current) {
          lastActiveRef.current = syncedVal
          scheduleTimer(Math.max(delay - (Date.now() - syncedVal), 1000))
        }
      }
    }

    const activityEvents = ['mousemove', 'keydown', 'keyup', 'mousedown', 'scroll', 'touchstart', 'click', 'input', 'change']
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })
    window.addEventListener('focus', handleVisibilityOrFocus)
    window.addEventListener('storage', handleStorageSync)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      window.removeEventListener('focus', handleVisibilityOrFocus)
      window.removeEventListener('storage', handleStorageSync)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [user?.id, delay])
}
