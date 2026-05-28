import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { loadRoles as loadRolesController } from '@/controllers/roleController'
import { loadDepartments as loadDepartmentsController } from '@/controllers/departmentController'

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
    setLoading(true)
    setError('')
    try {
      const [r, d] = await Promise.all([loadRolesController(), loadDepartmentsController()])
      setRoles(r || [])
      setDepartments(d || [])
    } catch (err) {
      console.error('Lookup reload error:', err)
      setRoles([])
      setDepartments([])
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reloadLookups() }, [reloadLookups])

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
