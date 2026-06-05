import { useEffect, useRef } from 'react'

/**
 * Custom hook to monitor user activity and trigger a logout callback
 * when the user has been idle for the specified delay period.
 * 
 * @param {object|null} user - The current authenticated user object.
 * @param {function} onTimeout - The callback to execute when idle limit is reached.
 * @param {number} delay - Time in milliseconds before timing out (defaults to 15 minutes).
 */
export function useIdleTimeout(user, onTimeout, delay = 900000) {
  const timeoutIdRef = useRef(null)

  useEffect(() => {
    // Only monitor activity if a user is logged in
    if (!user || !onTimeout) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
      return
    }

    const resetTimer = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      timeoutIdRef.current = setTimeout(() => {
        console.log('[useIdleTimeout] Idle timeout reached. Logging out user.')
        onTimeout()
      }, delay)
    }

    // Start timer on mount/user login
    resetTimer()

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'click']
    const handleActivity = () => resetTimer()

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [user, onTimeout, delay])
}
