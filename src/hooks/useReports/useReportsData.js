import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadDepartments } from '@/services/departmentService'
import { fetchLocations } from '@/services/locationService'
import { fetchUsers } from '@/services/userService'

export function toOptionList(items, labelKey) {
  return (items || []).map((item) => ({ id: item.id, label: item[labelKey] || '' }))
}

export function useReportsData({ currentAuthId, setError }) {
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])

  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)

  const loadLookupData = useCallback(async () => {
    setDepartmentsLoading(true)
    setLocationsLoading(true)
    setUsersLoading(true)
    try {
      const [deptData, locData, userData] = await Promise.all([
        loadDepartments(),
        fetchLocations(),
        fetchUsers()
      ])
      setDepartments(Array.isArray(deptData) ? deptData : [])
      setLocations(Array.isArray(locData) ? locData : [])
      setUsers(Array.isArray(userData) ? userData : [])
    } catch (err) {
      setError(err?.message || 'Failed to load reference data.')
    } finally {
      setDepartmentsLoading(false)
      setLocationsLoading(false)
      setUsersLoading(false)
    }
  }, [setError])

  useEffect(() => {
    if (currentAuthId) {
      loadLookupData()
    }
  }, [currentAuthId, loadLookupData])

  const locationOptions = useMemo(() => toOptionList(locations, 'location_name'), [locations])
  const departmentNameById = useMemo(
    () => new Map((departments || []).map((d) => [String(d.id), d.department_name])),
    [departments]
  )
  const userNameById = useMemo(
    () => new Map((users || []).map((u) => [String(u.id), u.user_name || 'Unnamed'])),
    [users]
  )

  return {
    departments,
    locations,
    users,
    departmentsLoading,
    locationsLoading,
    usersLoading,
    locationOptions,
    departmentNameById,
    userNameById,
    loadLookupData
  }
}
