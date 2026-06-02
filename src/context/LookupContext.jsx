import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { loadRoles as loadRolesController } from '@/services/roleService'
import { loadDepartments as loadDepartmentsController } from '@/services/departmentService'
import { supabase } from '@/utils/supabase'

const LookupContext = createContext({
  roles: [],
  departments: [],
  loading: false,
  error: '',
  reloadLookups: async () => {},
})

export function LookupProvider({ children }) {
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reloadLookups = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // Bypass loading database lookups if not logged in to prevent 401 console errors
      return
    }

    setLoading(true)
    setError('')
    try {
      const [r, d] = await Promise.all([loadRolesController(), loadDepartmentsController()])
      // If a reload unexpectedly returns empty arrays but we already have values,
      // preserve the existing lookups to avoid wiping the UI due to a transient API glitch.
      setRoles((prev) => {
        const next = r || []
        if (next.length === 0 && Array.isArray(prev) && prev.length > 0) {
          console.warn('Lookup reload returned no roles; preserving existing roles')
          return prev
        }
        return next
      })
      setDepartments((prev) => {
        const next = d || []
        if (next.length === 0 && Array.isArray(prev) && prev.length > 0) {
          console.warn('Lookup reload returned no departments; preserving existing departments')
          return prev
        }
        return next
      })
    } catch (err) {
      console.error('Lookup reload error:', err)
      setRoles([])
      setDepartments([])
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load check
    reloadLookups()

    // Listen for auth state changes (e.g. user logs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        reloadLookups()
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [reloadLookups])

  return (
    <LookupContext.Provider value={{ roles, departments, loading, error, reloadLookups }}>
      {children}
    </LookupContext.Provider>
  )
}

export function useLookup() {
  return useContext(LookupContext)
}

export default LookupContext
