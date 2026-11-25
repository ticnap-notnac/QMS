import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadDepartments } from '@/services/departmentService'
import { fetchLocations } from '@/services/locationService'
import { fetchUsers } from '@/services/userService'
import { fetchIssueTypes } from '@/services/issueTypeService'
import { fetchProducts } from '@/services/productService'
import { fetchProductTypes } from '@/services/productTypeService'
import { useLookup } from '@/context/LookupContext'

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

// Short-lived in-memory cache so switching tabs back to /reports doesn't block on 6 API requests
const lookupMemoryCache = {
  departments: null,
  locations: null,
  users: null,
  issueTypes: null,
  products: null,
  productTypes: null,
  timestamp: 0
}
const LOOKUP_CACHE_TTL_MS = 60000

export function toOptionList(items, labelKey) {
  return (items || []).map((item) => ({ id: item.id, label: item[labelKey] || '' }))
}

export function useReportsData({ currentAuthId, setError }) {
  const { departments: ctxDepartments, products: ctxProducts } = useLookup()

  const [departments, setDepartments] = useState(
    () => lookupMemoryCache.departments || (Array.isArray(ctxDepartments) && ctxDepartments.length > 0 ? ctxDepartments : [])
  )
  const [locations, setLocations] = useState(() => lookupMemoryCache.locations || [])
  const [users, setUsers] = useState(() => lookupMemoryCache.users || [])
  const [issueTypes, setIssueTypes] = useState(() => lookupMemoryCache.issueTypes || [])
  const [products, setProducts] = useState(
    () => lookupMemoryCache.products || (Array.isArray(ctxProducts) && ctxProducts.length > 0 ? ctxProducts : [])
  )
  const [productTypes, setProductTypes] = useState(() => lookupMemoryCache.productTypes || [])

  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [issueTypesLoading, setIssueTypesLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)

  // Sync from LookupContext immediately if local state is empty
  useEffect(() => {
    if (Array.isArray(ctxDepartments) && ctxDepartments.length > 0 && departments.length === 0) {
      setDepartments(ctxDepartments)
      lookupMemoryCache.departments = ctxDepartments
    }
  }, [ctxDepartments, departments.length])

  useEffect(() => {
    if (Array.isArray(ctxProducts) && ctxProducts.length > 0 && products.length === 0) {
      setProducts(ctxProducts)
      lookupMemoryCache.products = ctxProducts
    }
  }, [ctxProducts, products.length])

  const loadLookupData = useCallback(async ({ force = false } = {}) => {
    const now = Date.now()
    const isCacheFresh =
      !force &&
      lookupMemoryCache.timestamp > 0 &&
      now - lookupMemoryCache.timestamp < LOOKUP_CACHE_TTL_MS &&
      Array.isArray(lookupMemoryCache.users) &&
      lookupMemoryCache.users.length > 0

    if (isCacheFresh) {
      return
    }

    const hasCachedDepts = !force && Array.isArray(ctxDepartments) && ctxDepartments.length > 0
    const hasCachedProds = !force && Array.isArray(ctxProducts) && ctxProducts.length > 0

    if (!hasCachedDepts) setDepartmentsLoading(true)
    setLocationsLoading(true)
    setUsersLoading(true)
    setIssueTypesLoading(true)
    if (!hasCachedProds) setProductsLoading(true)

    try {
      const [deptData, locData, userData, issueData, prodData, prodTypeData] = await Promise.all([
        hasCachedDepts ? Promise.resolve(ctxDepartments) : loadDepartments(),
        fetchLocations(),
        fetchUsers(),
        fetchIssueTypes().catch(() => []),
        hasCachedProds ? Promise.resolve(ctxProducts) : fetchProducts().catch(() => []),
        fetchProductTypes().catch(() => [])
      ])

      const nextDepts = Array.isArray(deptData) ? deptData : []
      const nextLocs = Array.isArray(locData) ? locData : []
      const nextUsers = Array.isArray(userData) ? userData : []
      const nextIssues = Array.isArray(issueData) ? issueData : []
      const nextProds = Array.isArray(prodData) ? prodData : []
      const nextProdTypes = Array.isArray(prodTypeData) ? prodTypeData : []

      lookupMemoryCache.departments = nextDepts
      lookupMemoryCache.locations = nextLocs
      lookupMemoryCache.users = nextUsers
      lookupMemoryCache.issueTypes = nextIssues
      lookupMemoryCache.products = nextProds
      lookupMemoryCache.productTypes = nextProdTypes
      lookupMemoryCache.timestamp = Date.now()

      setDepartments(nextDepts)
      setLocations(nextLocs)
      setUsers(nextUsers)
      setIssueTypes(nextIssues)
      setProducts(nextProds)
      setProductTypes(nextProdTypes)
    } catch (err) {
      setError(err?.message || 'Failed to load reference data.')
    } finally {
      setDepartmentsLoading(false)
      setLocationsLoading(false)
      setUsersLoading(false)
      setIssueTypesLoading(false)
      setProductsLoading(false)
    }
  }, [ctxDepartments, ctxProducts, setError])

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
