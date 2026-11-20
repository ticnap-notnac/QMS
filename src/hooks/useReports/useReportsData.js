import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadDepartments } from '@/services/departmentService'
import { fetchLocations } from '@/services/locationService'
import { fetchUsers } from '@/services/userService'
import { fetchIssueTypes } from '@/services/issueTypeService'
import { fetchProducts } from '@/services/productService'
import { fetchProductTypes } from '@/services/productTypeService'

const DEFAULT_NON_CONFORMANCE_TYPES = [
  'Quality/Food Safety Issue',
  'Environment, Health and Safety Issue',
  'Security Issue',
  'Internal Audit',
  'Customer Complaint',
  'Government Agency Audit Non-Conformance',
  'Customer Audit Non-Conformance',
  'Vendor Non-Conformance'
]

export function toOptionList(items, labelKey) {
  return (items || []).map((item) => ({ id: item.id, label: item[labelKey] || '' }))
}

export function useReportsData({ currentAuthId, setError }) {
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [products, setProducts] = useState([])
  const [productTypes, setProductTypes] = useState([])

  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [issueTypesLoading, setIssueTypesLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)

  const loadLookupData = useCallback(async () => {
    setDepartmentsLoading(true)
    setLocationsLoading(true)
    setUsersLoading(true)
    setIssueTypesLoading(true)
    setProductsLoading(true)
    try {
      const [deptData, locData, userData, issueData, prodData, prodTypeData] = await Promise.all([
        loadDepartments(),
        fetchLocations(),
        fetchUsers(),
        fetchIssueTypes().catch(() => []),
        fetchProducts().catch(() => []),
        fetchProductTypes().catch(() => [])
      ])
      setDepartments(Array.isArray(deptData) ? deptData : [])
      setLocations(Array.isArray(locData) ? locData : [])
      setUsers(Array.isArray(userData) ? userData : [])
      setIssueTypes(Array.isArray(issueData) ? issueData : [])
      setProducts(Array.isArray(prodData) ? prodData : [])
      setProductTypes(Array.isArray(prodTypeData) ? prodTypeData : [])
    } catch (err) {
      setError(err?.message || 'Failed to load reference data.')
    } finally {
      setDepartmentsLoading(false)
      setLocationsLoading(false)
      setUsersLoading(false)
      setIssueTypesLoading(false)
      setProductsLoading(false)
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

  const nonConformanceTypeOptions = useMemo(() => {
    const fromDb = (issueTypes || []).map(i => i.issue_type_name).filter(Boolean)
    const combined = Array.from(new Set([...DEFAULT_NON_CONFORMANCE_TYPES, ...fromDb]))
    return combined.map((name, idx) => ({ id: idx + 1, label: name }))
  }, [issueTypes])

  const productOptions = useMemo(() => toOptionList(products, 'product_name'), [products])

  return {
    departments,
    locations,
    users,
    issueTypes,
    products,
    productTypes,
    departmentsLoading,
    locationsLoading,
    usersLoading,
    issueTypesLoading,
    productsLoading,
    locationOptions,
    nonConformanceTypeOptions,
    productOptions,
    departmentNameById,
    userNameById,
    loadLookupData
  }
}
