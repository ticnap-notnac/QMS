import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { loadRoles as loadRolesController } from '@/services/roleService'
import { loadDepartments as loadDepartmentsController } from '@/services/departmentService'
import { fetchSites } from '@/services/siteService'
import { supabase } from '@/utils/supabase'

const LookupContext = createContext({
  roles: [],
  departments: [],
  sites: [],
  userSiteId: null,
  userSiteName: null,
  loading: false,
  error: '',
  reloadLookups: async () => {},
})

export function LookupProvider({ children }) {
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  const [sites, setSites] = useState([])
  const [userSiteId, setUserSiteId] = useState(null)
  const [userSiteName, setUserSiteName] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resolveUserSite = useCallback(async (session) => {
    if (!session?.user?.id) return
    try {
      const { data } = await supabase
        .from('users')
        .select('site_id, sites(id, site_name, site_code)')
        .eq('auth_id', session.user.id)
        .maybeSingle()
      setUserSiteId(data?.site_id ?? null)
      setUserSiteName(data?.sites?.site_name ?? null)
    } catch (err) {
      console.warn('Failed to resolve user site:', err?.message || err)
    }
  }, [])

  const reloadLookups = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // Bypass loading database lookups if not logged in to prevent 401 console errors
      return
    }

    setLoading(true)
    setError('')
    try {
      const [r, d, s] = await Promise.all([
        loadRolesController(),
        loadDepartmentsController(),
        fetchSites(),
      ])
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
      setSites(Array.isArray(s) ? s : [])
      await resolveUserSite(session)
    } catch (err) {
      console.error('Lookup reload error:', err)
      setRoles([])
      setDepartments([])
      setSites([])
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [resolveUserSite])

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
    <LookupContext.Provider value={{ roles, departments, sites, userSiteId, userSiteName, loading, error, reloadLookups }}>
      {children}
    </LookupContext.Provider>
  )
}

export function useLookup() {
  return useContext(LookupContext)
}

export default LookupContext
