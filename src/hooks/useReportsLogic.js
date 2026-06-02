import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { loadDepartments } from '@/services/departmentService'
import { createReport, fetchInvestigatedReports, fetchReports, reviewReportApproval, submitNcrMultipart } from '@/services/ncrService'
import { fetchLocations, createLocation } from '@/services/locationService'
import { fetchProductTypes, createProductType } from '@/services/productTypeService'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CREATE_FORM = {
  productType: '',
  batchNumber: '',
  location: '',
  severity: '',
  department: '',
  description: '',
  investigationText: '',
  resolutionTime: '24h',
  verificationDate: '',
  preventiveRating: 'Excellent',
}

// ─── Pure helpers (no side-effects, safe to unit-test independently) ──────────

export function formatDate(value) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function normalizeSeverity(value) {
  return String(value || 'low').trim().toLowerCase()
}

export function getStatusStyle(status) {
  if (String(status).toLowerCase() === 'closed') {
    return { background: 'rgba(148, 163, 184, 0.18)', color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.3)' }
  }
  return { background: 'rgba(34, 197, 94, 0.16)', color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.28)' }
}

export function getSeverityStyle(severity) {
  const value = String(severity).toLowerCase()
  if (value === 'high') return { background: 'rgba(239, 68, 68, 0.18)', color: '#fecaca', borderColor: 'rgba(239, 68, 68, 0.32)' }
  if (value === 'medium') return { background: 'rgba(245, 158, 11, 0.18)', color: '#fde68a', borderColor: 'rgba(245, 158, 11, 0.32)' }
  return { background: 'rgba(59, 130, 246, 0.18)', color: '#bfdbfe', borderColor: 'rgba(59, 130, 246, 0.32)' }
}

export function getApprovalState(report) {
  return String(report?.status || '').trim().toLowerCase() === 'closed' ? 'approved' : 'pending'
}

export function formatAssignedUser(report) {
  if (!report?.assigned_to) return ''
  return `Assigned to user #${report.assigned_to}`
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
  const selectedSeverities = (filters?.severities || [])
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean)

  return (reportList || []).filter((report) => {
    if (filters?.departmentId && String(report.department_id || '') !== String(filters.departmentId)) return false
    if (filters?.status && String(report.status || '').trim().toLowerCase() !== String(filters.status).trim().toLowerCase()) return false
    if (selectedSeverities.length > 0 && !selectedSeverities.includes(normalizeSeverity(report.severity))) return false
    if (filters?.date && String(report.occurrence_date || '') !== String(filters.date)) return false
    return true
  })
}

export function toOptionList(items, labelKey) {
  return (items || []).map((item) => ({ id: item.id, label: item[labelKey] || '' }))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {{ currentUserId: string, userRole: string, authUserId: string }} props
 */
export function useReportsLogic({ currentUserId, userRole, authUserId }) {
  const { user: authUser } = useAuth()
  const currentAuthId = authUser?.id || authUserId || ''

  // ── Modal visibility ────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isPreventiveActionModalOpen, setIsPreventiveActionModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)

  // ── Async / UI state ────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false)
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  // ── Data ────────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState([])
  const [investigatedReports, setInvestigatedReports] = useState([])
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [productTypes, setProductTypes] = useState([])

  // ── Loading states for lookup data ──────────────────────────────────────────
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [productTypesLoading, setProductTypesLoading] = useState(false)

  // ── Selection / targets ─────────────────────────────────────────────────────
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedAssignmentReport, setSelectedAssignmentReport] = useState(null)
  const [rejectTargetReport, setRejectTargetReport] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── View mode ───────────────────────────────────────────────────────────────
  const [isApprovalQueueMode, setIsApprovalQueueMode] = useState(false)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [reportFilters, setReportFilters] = useState({ departmentId: '', status: '', severities: [], date: '' })

  // ── Create-form fields ──────────────────────────────────────────────────────
  const [productType, setProductType] = useState(DEFAULT_CREATE_FORM.productType)
  const [productTypeId, setProductTypeId] = useState('')
  const [batchNumber, setBatchNumber] = useState(DEFAULT_CREATE_FORM.batchNumber)
  const [location, setLocation] = useState(DEFAULT_CREATE_FORM.location)
  const [locationId, setLocationId] = useState('')
  const [severity, setSeverity] = useState(DEFAULT_CREATE_FORM.severity)
  const [department, setDepartment] = useState(DEFAULT_CREATE_FORM.department)
  const [description, setDescription] = useState(DEFAULT_CREATE_FORM.description)
  const [preventiveRating, setPreventiveRating] = useState(DEFAULT_CREATE_FORM.preventiveRating)

  // ── Evidence upload ─────────────────────────────────────────────────────────
  const fileInputRefMain = useRef(null)
  const [evidenceFileMain, setEvidenceFileMain] = useState(null)
  const [evidencePreviewMain, setEvidencePreviewMain] = useState(null)
  const [evidenceErrorMain, setEvidenceErrorMain] = useState(null)

  // ─── Derived / memoised ────────────────────────────────────────────────────

  const canAssignReports = useMemo(
    () => ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase()),
    [userRole],
  )

  /**
   * Returns true if the current user is allowed to update the given report.
   * - Admins and auditors can always update.
   * - Regular users can only update if they are the assigned user.
   */
  const canUpdateReport = useCallback(
    (report) => {
      if (!report) return false
      if (canAssignReports) return true
      return String(report.assigned_to || '') !== '' &&
        String(report.assigned_to) === String(currentAuthId)
    },
    [canAssignReports, currentAuthId],
  )

  const locationOptions = useMemo(() => toOptionList(locations, 'location_name'), [locations])
  const productTypeOptions = useMemo(() => toOptionList(productTypes, 'product_type_name'), [productTypes])

  const departmentNameById = useMemo(
    () => new Map((departments || []).map((d) => [String(d.id), d.department_name])),
    [departments],
  )

  const approvalQueueReports = useMemo(
    () =>
      (investigatedReports || []).filter(
        (r) => Boolean(r?.investigation_details) && String(r?.status || '').trim().toLowerCase() !== 'closed',
      ),
    [investigatedReports],
  )

  const displayedInvestigatedReports = isApprovalQueueMode ? approvalQueueReports : investigatedReports

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const refreshReportsList = useCallback(
    async (filters = reportFilters) => {
      setIsLoading(true)
      setError(null)
      try {
        const [openData, investigatedData] = await Promise.all([fetchReports(), fetchInvestigatedReports()])
        const open = Array.isArray(openData) ? openData : []
        const resolved = Array.isArray(investigatedData) ? investigatedData : []
        setReports(sortReportsForCurrentUser(applyReportFilters(open, filters), currentUserId))
        setInvestigatedReports(sortReportsForCurrentUser(applyReportFilters(resolved, filters), currentUserId))
      } catch (err) {
        setError(err?.message || 'Failed to load NCR reports.')
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reportFilters, currentUserId],
  )

  const loadLookupData = useCallback(async () => {
    setDepartmentsLoading(true)
    setLocationsLoading(true)
    setProductTypesLoading(true)
    try {
      const [deptData, locData, ptData] = await Promise.all([loadDepartments(), fetchLocations(), fetchProductTypes()])
      setDepartments(Array.isArray(deptData) ? deptData : [])
      setLocations(Array.isArray(locData) ? locData : [])
      setProductTypes(Array.isArray(ptData) ? ptData : [])
    } catch (err) {
      setError(err?.message || 'Failed to load NCR reference data.')
    } finally {
      setDepartmentsLoading(false)
      setLocationsLoading(false)
      setProductTypesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLookupData()
    refreshReportsList()
  }, [currentAuthId]) // re-fetch when auth identity changes

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const resetCreateForm = () => {
    setProductType(DEFAULT_CREATE_FORM.productType)
    setProductTypeId('')
    setBatchNumber(DEFAULT_CREATE_FORM.batchNumber)
    setLocation(DEFAULT_CREATE_FORM.location)
    setLocationId('')
    setSeverity(DEFAULT_CREATE_FORM.severity)
    setDepartment(DEFAULT_CREATE_FORM.department)
    setDescription(DEFAULT_CREATE_FORM.description)
  }

  const clearEvidenceState = () => {
    if (evidencePreviewMain) {
      try { URL.revokeObjectURL(evidencePreviewMain) } catch (_) { }
    }
    setEvidenceFileMain(null)
    setEvidencePreviewMain(null)
    setEvidenceErrorMain(null)
  }

  // ─── Modal handlers ────────────────────────────────────────────────────────

  const openCreateModal = () => { setError(null); resetCreateForm(); setIsModalOpen(true) }
  const closeCreateModal = () => { setIsModalOpen(false); clearEvidenceState() }

  const openUpdateModal = (report) => { setSelectedReport(report); setIsUpdateModalOpen(true) }
  const closeUpdateModal = () => { setIsUpdateModalOpen(false); setSelectedReport(null) }

  const openAssignModal = (report) => { setSelectedAssignmentReport(report); setIsAssignModalOpen(true) }
  const closeAssignModal = () => { setIsAssignModalOpen(false); setSelectedAssignmentReport(null) }

  const openRejectModal = (report) => { setRejectTargetReport(report); setRejectReason(''); setIsRejectModalOpen(true) }
  const closeRejectModal = () => { setIsRejectModalOpen(false); setRejectTargetReport(null); setRejectReason('') }

  // ─── Filter handlers ───────────────────────────────────────────────────────

  const handleFilterApply = async (filters) => { setReportFilters(filters); await refreshReportsList(filters) }

  const handleFilterClear = async () => {
    const cleared = { departmentId: '', status: '', severities: [], date: '' }
    setReportFilters(cleared)
    await refreshReportsList(cleared)
  }

  // ─── Report actions ────────────────────────────────────────────────────────

  const handleUpdateSuccess = async () => {
    setToast({ message: 'Report updated successfully', type: 'success' })
    closeUpdateModal()
    await refreshReportsList()
  }

  const handleAssignSuccess = async ({ selectedUser }) => {
    const name = selectedUser?.user_name || 'employee'
    const ref = selectedAssignmentReport?.reference_no || 'report'
    setToast({ message: `Report ${ref} assigned to ${name}`, type: 'success' })
    closeAssignModal()
    await refreshReportsList()
  }

  const handleReviewReport = async (report, decision, reason = '') => {
    if (!report?.id) return
    setError(null)
    const normalized = String(decision || '').trim().toLowerCase()
    const trimmedReason = String(reason || '').trim()

    if (normalized === 'reject' && !trimmedReason) {
      setToast({ message: 'Rejection cancelled. Reason is required.', type: 'warning' })
      return
    }

    try {
      setIsReviewSubmitting(true)
      await reviewReportApproval(report.id, { decision: normalized, reason: trimmedReason || undefined })
      const label = normalized === 'approve' ? 'approved' : 'rejected'
      setToast({ message: `Report ${report.reference_no || report.id} ${label}.`, type: normalized === 'approve' ? 'success' : 'warning' })
      if (normalized === 'reject') closeRejectModal()
      await refreshReportsList()
    } catch (err) {
      setError(err?.message || 'Failed to review report.')
    } finally {
      setIsReviewSubmitting(false)
    }
  }

  // ─── Submit report ─────────────────────────────────────────────────────────

  /**
   * Resolves a catalog item by ID, exact match, or creates it via the API.
   * @NOTE: Does NOT assume any DB column beyond those confirmed in service contracts.
   */
  const resolveCatalogSelection = async ({ inputValue, selectedId, options, createFn, optionLabelKey }) => {
    const trimmed = String(inputValue || '').trim()
    if (!trimmed) throw new Error('Location and product type are required.')

    if (selectedId) {
      const byId = options.find((o) => String(o.id) === String(selectedId))
      if (byId) return { id: byId.id, label: byId[optionLabelKey] || byId.label || trimmed }
    }

    const exact = options.find(
      (o) => String(o[optionLabelKey] || o.label || '').trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exact) return { id: exact.id, label: exact[optionLabelKey] || exact.label || trimmed }

    const created = await createFn(trimmed)
    const item = Array.isArray(created) ? created[0] : created
    return { id: item?.id, label: item?.[optionLabelKey] || item?.label || trimmed }
  }

  const handleSubmitReport = async (event) => {
    event.preventDefault()
    try {
      setError(null)

      const resolvedProductType = await resolveCatalogSelection({
        inputValue: productType,
        selectedId: productTypeId,
        options: productTypeOptions,
        createFn: createProductType,
        optionLabelKey: 'label',
      })

      const resolvedLocation = await resolveCatalogSelection({
        inputValue: location,
        selectedId: locationId,
        options: locationOptions,
        createFn: createLocation,
        optionLabelKey: 'label',
      })

      if (evidenceFileMain) {
        if (!currentAuthId) throw new Error('Missing authenticated user. Please log in again.')
        const fd = new FormData()
        fd.append('product_type_id', resolvedProductType.id)
        fd.append('batch_number', batchNumber)
        fd.append('location_id', resolvedLocation.id)
        fd.append('severity', severity)
        fd.append('department_id', department)
        fd.append('description', description)
        fd.append('car_filed', 'false')
        fd.append('qddr_filed', 'false')
        fd.append('evidence', evidenceFileMain)
        await submitNcrMultipart(fd, currentAuthId)
      } else {
        await createReport({
          product_type_id: resolvedProductType.id,
          batch_number: batchNumber,
          location_id: resolvedLocation.id,
          severity,
          department_id: department,
          description,
          car_filed: false,
          qddr_filed: false,
          evidence_url: null,
        })
      }

      setIsModalOpen(false)
      clearEvidenceState()
      resetCreateForm()
      await loadLookupData()
      await refreshReportsList()
    } catch (err) {
      setError(err?.message || 'Failed to submit NCR report.')
    }
  }

  // ─── Returned API ──────────────────────────────────────────────────────────

  return {
    // State — UI
    isLoading,
    isReviewSubmitting,
    error,
    toast,
    setToast,

    // State — modal visibility
    isModalOpen,
    isFilterModalOpen,
    setIsFilterModalOpen,
    isUpdateModalOpen,
    isAssignModalOpen,
    isPreventiveActionModalOpen,
    setIsPreventiveActionModalOpen,
    isRejectModalOpen,

    // State — data
    reports,
    investigatedReports,
    displayedInvestigatedReports,
    approvalQueueReports,
    departments,
    locationOptions,
    productTypeOptions,
    departmentNameById,

    // State — loading indicators
    departmentsLoading,
    locationsLoading,
    productTypesLoading,

    // State — selection
    selectedReport,
    selectedAssignmentReport,
    rejectTargetReport,
    rejectReason,
    setRejectReason,

    // State — view mode
    isApprovalQueueMode,
    setIsApprovalQueueMode,

    // State — create form (spread-friendly object)
    createFormState: {
      productType, setProductType,
      productTypeId, setProductTypeId,
      batchNumber, setBatchNumber,
      location, setLocation,
      locationId, setLocationId,
      severity, setSeverity,
      department, setDepartment,
      description, setDescription,
      preventiveRating, setPreventiveRating,
    },

    // State — evidence
    fileInputRefMain,
    evidenceFileMain,
    setEvidenceFileMain,
    evidencePreviewMain,
    setEvidencePreviewMain,
    evidenceErrorMain,
    setEvidenceErrorMain,

    // Derived
    canAssignReports,
    canUpdateReport,

    // Handlers
    openCreateModal,
    closeCreateModal,
    openUpdateModal,
    closeUpdateModal,
    openAssignModal,
    closeAssignModal,
    openRejectModal,
    closeRejectModal,
    handleFilterApply,
    handleFilterClear,
    handleUpdateSuccess,
    handleAssignSuccess,
    handleReviewReport,
    handleSubmitReport,
  }
}