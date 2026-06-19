import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadDepartments } from '@/services/departmentService'
import { fetchAllReports } from '@/services/ncrService'
import { fetchLocations } from '@/services/locationService'
import { fetchProductTypes } from '@/services/productTypeService'
import { fetchIssueTypes } from '@/services/issueTypeService'
import { fetchUsers } from '@/services/userService'
import { REPORT_STATUS } from '../../../shared/constants'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function normalizeSeverity(value) {
  return String(value || 'low').trim().toLowerCase()
}

function toTimestamp(value) {
  const ts = new Date(value || 0).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

function isReportAssignedToCurrentUser(report, currentUserId) {
  if (!currentUserId) return false
  return (
    String(report?.assigned_to || '') === String(currentUserId) ||
    String(report?.reported_by || '') === String(currentUserId)
  )
}

function sortReportsForCurrentUser(reportList, currentUserId) {
  return [...(reportList || [])].sort((a, b) => {
    const aMine = isReportAssignedToCurrentUser(a, currentUserId)
    const bMine = isReportAssignedToCurrentUser(b, currentUserId)
    if (aMine !== bMine) return aMine ? -1 : 1
    return toTimestamp(a?.created_at) - toTimestamp(b?.created_at)
  })
}

function applyReportFilters(reportList, filters) {
  console.log('[applyReportFilters] filters:', filters)
  const selectedSeverities = (filters?.severities || [])
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean)
  const singleSeverity = String(filters?.severity || '').trim().toLowerCase()

  const result = (reportList || []).filter((report) => {
    if (filters?.departmentId && String(report.department_id || '') !== String(filters.departmentId)) {
      console.log(`[applyReportFilters] Filtering out report ${report.reference_no} because department_id ${report.department_id} !== filter ${filters.departmentId}`)
      return false
    }
    if (filters?.status && String(report.status || '').trim().toLowerCase() !== String(filters.status).trim().toLowerCase()) return false
    
    const reportSev = normalizeSeverity(report.severity)
    if (selectedSeverities.length > 0 && !selectedSeverities.includes(reportSev)) return false
    if (singleSeverity && reportSev !== singleSeverity) return false

    if (filters?.date && String(report.occurrence_date || '') !== String(filters.date)) return false
    return true
  })
  console.log('[applyReportFilters] result list size:', result.length)
  return result
}

export function toOptionList(items, labelKey) {
  return (items || []).map((item) => ({ id: item.id, label: item[labelKey] || '' }))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReportsData({ currentUserId, currentAuthId, reportFilters, setError, userRole, userDepartmentId }) {
  const [isLoading, setIsLoading] = useState(false)
  const [reports, setReports] = useState([])
  const [investigatedReports, setInvestigatedReports] = useState([])
  const [closedReports, setClosedReports] = useState([])
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [users, setUsers] = useState([])

  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [productTypesLoading, setProductTypesLoading] = useState(false)
  const [issueTypesLoading, setIssueTypesLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)

  const refreshReportsList = useCallback(
    async (filters = reportFilters) => {
      console.log('[refreshReportsList] Called with filters:', filters, 'current reportFilters:', reportFilters)
      setIsLoading(true)
      setError(null)
      try {
        const allData = await fetchAllReports()
        const allArray = Array.isArray(allData) ? allData : []
        
        const isStandardUser = !['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase())
        const scopedArray = isStandardUser
          ? allArray.filter(r => String(r.department_id) === String(userDepartmentId))
          : allArray

        const open = scopedArray.filter(r => !r.investigation_details && String(r.status).trim().toLowerCase() !== REPORT_STATUS.CLOSED.toLowerCase())
        const resolved = scopedArray.filter(r => !!r.investigation_details && String(r.status).trim().toLowerCase() !== REPORT_STATUS.CLOSED.toLowerCase())
        const closed = scopedArray.filter(r => String(r.status).trim().toLowerCase() === REPORT_STATUS.CLOSED.toLowerCase())

        setReports(sortReportsForCurrentUser(applyReportFilters(open, filters), currentUserId))
        setInvestigatedReports(sortReportsForCurrentUser(applyReportFilters(resolved, filters), currentUserId))
        
        let filteredClosed = closed
        if (filters?.departmentId) {
          filteredClosed = closed.filter(r => String(r.department_id) === String(filters.departmentId))
        }
        setClosedReports(sortReportsForCurrentUser(filteredClosed, currentUserId))
      } catch (err) {
        setError(err?.message || 'Failed to load NCR reports.')
      } finally {
        setIsLoading(false)
      }
    },
    [reportFilters, currentUserId, setError, userRole, userDepartmentId]
  )

  const loadLookupData = useCallback(async () => {
    setDepartmentsLoading(true)
    setLocationsLoading(true)
    setProductTypesLoading(true)
    setIssueTypesLoading(true)
    setUsersLoading(true)
    try {
      const [deptData, locData, ptData, issueData, userData] = await Promise.all([
        loadDepartments(),
        fetchLocations(),
        fetchProductTypes(),
        fetchIssueTypes(),
        fetchUsers()
      ])
      setDepartments(Array.isArray(deptData) ? deptData : [])
      setLocations(Array.isArray(locData) ? locData : [])
      setProductTypes(Array.isArray(ptData) ? ptData : [])
      setIssueTypes(Array.isArray(issueData) ? issueData : [])
      setUsers(Array.isArray(userData) ? userData : [])
    } catch (err) {
      setError(err?.message || 'Failed to load NCR reference data.')
    } finally {
      setDepartmentsLoading(false)
      setLocationsLoading(false)
      setProductTypesLoading(false)
      setIssueTypesLoading(false)
      setUsersLoading(false)
    }
  }, [setError])

  useEffect(() => {
    Promise.resolve().then(() => {
      loadLookupData()
      refreshReportsList()
    })
  }, [currentAuthId, loadLookupData, refreshReportsList])

  const locationOptions = useMemo(() => toOptionList(locations, 'location_name'), [locations])
  const productTypeOptions = useMemo(() => toOptionList(productTypes, 'product_type_name'), [productTypes])
  const issueTypeOptions = useMemo(() => toOptionList(issueTypes, 'issue_type_name'), [issueTypes])
  const departmentNameById = useMemo(
    () => new Map((departments || []).map((d) => [String(d.id), d.department_name])),
    [departments]
  )

  return {
    isLoading,
    reports,
    investigatedReports,
    closedReports,
    departments,
    locations,
    productTypes,
    issueTypes,
    users,
    departmentsLoading,
    locationsLoading,
    productTypesLoading,
    issueTypesLoading,
    usersLoading,
    locationOptions,
    productTypeOptions,
    issueTypeOptions,
    departmentNameById,
    refreshReportsList,
    loadLookupData
  }
}
