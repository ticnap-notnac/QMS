import { useCallback, useMemo, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createReport, reviewReportApproval, submitNcrMultipart, updateReport, deleteReport } from '@/services/ncrService'
import { createLocation } from '@/services/locationService'
import { createProductType } from '@/services/productTypeService'
import { createIssueType } from '@/services/issueTypeService'
import { resolveCatalogSelection, filterApprovalQueueReports } from '@/utils/reportsHelpers'

import { useReportsData } from './useReports/useReportsData'
import { useReportsForm } from './useReports/useReportsForm'
import { useReportsModals } from './useReports/useReportsModals'
import { useReportsUpdateForm } from './useReports/useReportsUpdateForm'
import { useCARForm } from './useReports/useCARForm'
import { useQDDRForm } from './useReports/useQDDRForm'
import useAssignReportModal from './useReports/useAssignReportModal'
import useNCRSubmitModal from './useReports/useNCRSubmitModal'
import { useSuggestionLogic } from './useReports/useSuggestionLogic'
import { fetchExistingAiSuggestion } from '@/services/suggestionService'
import { dismissVerificationNotification } from '@/services/notificationService'
import { updateReportInvestigationMultipart } from '@/services/ncrService'
import { submitCarReport, suggestClausesForCar, submitCapaPlan, verifyCarPlan } from '@/services/carService'
import { supabase } from '@/utils/supabase'
import { submitQddrReport, updateQddrReport } from '@/services/qddrService'
import { useCARDetails } from './useCARDetails'
// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReportsLogic({ currentUserId, userRole, authUserId, userDepartmentId }) {
  const { user: authUser } = useAuth()
  const currentAuthId = authUser?.id || authUserId || ''

  // ── Async / UI state ────────────────────────────────────────────────────────
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)
  const [isNcrSubmitting, setIsNcrSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Preventive Action Rating state ──────────────────────────────────────────
  const [preventiveRating, setPreventiveRating] = useState('')
  const [customResolution, setCustomResolution] = useState('')
  const [ratingReportId, setRatingReportId] = useState(null)
  const [suggestedPreventiveAction, setSuggestedPreventiveAction] = useState('')
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)

  // ── View mode ───────────────────────────────────────────────────────────────
  const [isApprovalQueueMode, setIsApprovalQueueMode] = useState(false)
  const [isClosedMode, setIsClosedMode] = useState(false)
  const [activeTab, setActiveTab] = useState('ncr')

  // ── CAR & QDDR Reports lists state ───────────────────────────────────────────
  const [carReports, setCarReports] = useState([])
  const [loadingCar, setLoadingCar] = useState(false)
  const [qddrReports, setQddrReports] = useState([])
  const [loadingQddr, setLoadingQddr] = useState(false)

  // ── CAR details modal hook state ──
  const carDetails = useCARDetails()

  // ── QDDR Detail Modals state ──────────────────────────────────────────
  const [selectedQddr, setSelectedQddr] = useState(null)
  const [isQddrDetailsModalOpen, setIsQddrDetailsModalOpen] = useState(false)

  // ── Sub-hooks ───────────────────────────────────────────────────────────────
  const formState = useReportsForm()
  
  const dataState = useReportsData({
    currentUserId,
    currentAuthId,
    reportFilters: formState.reportFilters,
    setError,
    userRole,
    userDepartmentId
  })

  const modalsState = useReportsModals({
    clearEvidenceState: formState.clearEvidenceState,
    resetCreateForm: formState.resetCreateForm,
    setRejectReason,
    setError
  })

  const updateFormState = useReportsUpdateForm({
    report: modalsState.selectedReport,
  })

  const suggestionState = useSuggestionLogic({
    report: modalsState.selectedReport,
    deptName: dataState.departmentNameById.get(String(modalsState.selectedReport?.department_id || '')) || '—',
  })

  const carFormState = useCARForm(dataState.departments)
  const qddrFormState = useQDDRForm()

  const refreshCarAndQddrLists = useCallback(async () => {
    setLoadingCar(true)
    setLoadingQddr(true)
    try {
      const { data: carData, error: carError } = await supabase
        .from('car_reports')
        .select('*, audit_schedules(id, title, scheduled_date)')
        .order('created_at', { ascending: false })
      if (carError) throw carError

      const { data: qddrData, error: qddrError } = await supabase
        .from('qddr_reports')
        .select('*')
        .order('created_at', { ascending: false })
      if (qddrError) throw qddrError

      // Fetch NCRs to resolve their department ID
      const { data: ncrs } = await supabase
        .from('ncr_reports')
        .select('id, department_id')

      const ncrDeptMap = new Map((ncrs || []).map(n => [n.id, n.department_id]))
      const isStandardUser = !['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase())
      const activeDeptFilterId = formState.reportFilters.departmentId

      // 1. CAR department scoping/filtering
      let filteredCars = carData || []
      if (isStandardUser) {
        const userDeptName = dataState.departmentNameById.get(String(userDepartmentId))?.toLowerCase()
        filteredCars = (carData || []).filter(car => {
          if (Array.isArray(car.ncr_id) && car.ncr_id.length > 0) {
            return car.ncr_id.some(ncrId => String(ncrDeptMap.get(Number(ncrId))) === String(userDepartmentId))
          }
          if (car.ncr_id) {
            return String(ncrDeptMap.get(Number(car.ncr_id))) === String(userDepartmentId)
          }
          if (userDeptName) {
            return (
              car.requesting_department?.toLowerCase() === userDeptName ||
              car.responsible_department?.toLowerCase() === userDeptName
            )
          }
          return false
        })
      } else if (activeDeptFilterId) {
        const filterDeptName = dataState.departmentNameById.get(String(activeDeptFilterId))?.toLowerCase()
        filteredCars = (carData || []).filter(car => {
          if (Array.isArray(car.ncr_id) && car.ncr_id.length > 0) {
            return car.ncr_id.some(ncrId => String(ncrDeptMap.get(Number(ncrId))) === String(activeDeptFilterId))
          }
          if (car.ncr_id) {
            return String(ncrDeptMap.get(Number(car.ncr_id))) === String(activeDeptFilterId)
          }
          if (filterDeptName) {
            return (
              car.requesting_department?.toLowerCase() === filterDeptName ||
              car.responsible_department?.toLowerCase() === filterDeptName
            )
          }
          return false
        })
      }
      setCarReports(filteredCars)

      // 2. QDDR department scoping/filtering
      let filteredQddrs = qddrData || []
      if (isStandardUser) {
        filteredQddrs = (qddrData || []).filter(q => {
          if (q.ncr_id) {
            return String(ncrDeptMap.get(Number(q.ncr_id))) === String(userDepartmentId)
          }
          return false
        })
      } else if (activeDeptFilterId) {
        filteredQddrs = (qddrData || []).filter(q => {
          if (q.ncr_id) {
            return String(ncrDeptMap.get(Number(q.ncr_id))) === String(activeDeptFilterId)
          }
          return false
        })
      }
      setQddrReports(filteredQddrs)
    } catch (err) {
      console.error('Failed to load CAR/QDDR lists:', err)
      setError('Failed to load CAR/QDDR lists: ' + err.message)
    } finally {
      setLoadingCar(false)
      setLoadingQddr(false)
    }
  }, [setError, userRole, userDepartmentId, formState.reportFilters.departmentId, dataState.departmentNameById])

  useEffect(() => {
    if (currentAuthId) {
      const timer = setTimeout(() => {
        refreshCarAndQddrLists()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [currentAuthId, refreshCarAndQddrLists])

  // ISO Clauses options & auto-suggest states
  const [clauses, setClauses] = useState([])
  const [clausesLoading, setClausesLoading] = useState(false)
  const [suggestingClause, setSuggestingClause] = useState(false)

  useEffect(() => {
    let active = true
    const fetchClauses = async () => {
      setClausesLoading(true)
      try {
        const { data } = await supabase
          .from('iso_clauses')
          .select('id, clause_number, title')
          .eq('is_active', true)
          .order('clause_number')
        if (active) {
          setClauses((data || []).map(c => ({ id: c.id, label: `Clause ${c.clause_number} — ${c.title}` })))
        }
      } catch (err) {
        console.error('Failed to load clauses for dropdown:', err)
      } finally {
        if (active) setClausesLoading(false)
      }
    }
    fetchClauses()
    return () => { active = false }
  }, [])

  const handleSuggestClause = async () => {
    const desc = formState.createFormState.description
    const cat = formState.createFormState.issueType
    if (!desc || desc.trim().length < 15 || !currentAuthId) return
    setSuggestingClause(true)
    try {
      const flags = {
        quality_food_safety: cat?.toLowerCase().includes('quality') || false,
        environment_health_safety: cat?.toLowerCase().includes('environment') || false,
        security_issue: cat?.toLowerCase().includes('security') || false,
        internal_audit: cat?.toLowerCase().includes('audit') || false,
        customer_complaint: cat?.toLowerCase().includes('complaint') || false,
        vendor_nonconformance: cat?.toLowerCase().includes('vendor') || false,
      }
      const suggestions = await suggestClausesForCar({ description: desc, flags }, currentAuthId)
      if (suggestions && suggestions.length > 0) {
        formState.createFormState.setClauseId(suggestions[0].clause_id)
      }
    } catch (err) {
      console.warn('AI clause suggestion failed:', err)
    } finally {
      setSuggestingClause(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const openRatingId = params.get('openRating')
    if (openRatingId) {
      const loadRatingModal = async () => {
        let reportObj = (dataState.reports || []).find(r => String(r.id) === String(openRatingId)) || 
                        (dataState.investigatedReports || []).find(r => String(r.id) === String(openRatingId)) ||
                        (dataState.closedReports || []).find(r => String(r.id) === String(openRatingId))
        
        if (!reportObj) {
          try {
            const { data } = await supabase
              .from('ncr_reports')
              .select('*')
              .eq('id', openRatingId)
              .maybeSingle()
            if (data) reportObj = data
          } catch (err) {
            console.warn('Failed to query report by ID from DB:', err)
          }
        }

        if (reportObj) {
          try {
            const cached = await fetchExistingAiSuggestion(openRatingId)
            setRatingReportId(Number(openRatingId))
            setSuggestedPreventiveAction(cached?.preventive_suggestion || 'Implement standard verification and monitoring checks.')
            setPreventiveRating('')
            setCustomResolution(reportObj.resolution_details || '')
            modalsState.setIsPreventiveActionModalOpen(true)
            window.history.replaceState({}, document.title, window.location.pathname)
          } catch (e) {
            console.error('Failed to load suggestion for rating:', e)
          }
        }
      }
      const t = setTimeout(loadRatingModal, 500)
      return () => clearTimeout(t)
    }
  }, [dataState.reports, dataState.investigatedReports, dataState.closedReports, modalsState])

  // ─── Derived / memoised ────────────────────────────────────────────────────

  const canAssignReports = useMemo(
    () => ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase()),
    [userRole],
  )

  const canUpdateReport = useCallback(
    (report) => {
      if (!report) return false
      if (String(report.status || '').trim().toUpperCase() === 'CLOSED') return false
      if (canAssignReports) return true
      return String(report.assigned_to || '') !== '' &&
        String(report.assigned_to) === String(currentUserId)
    },
    [canAssignReports, currentUserId],
  )

  const canDeleteReport = useCallback(
    (report) => {
      if (!report) return false
      if (canAssignReports) return true
      return Number(report.reported_by) === Number(currentUserId)
    },
    [canAssignReports, currentUserId]
  )

  const handleDeleteReport = useCallback(
    async (report) => {
      if (!report) return
      const confirmed = window.confirm(`Are you sure you want to delete report ${report.reference_no || 'this report'}?`)
      if (!confirmed) return
      try {
        setError(null)
        await deleteReport(report.id)
        setToast({ message: `Report ${report.reference_no || ''} deleted successfully.`, type: 'success' })
        await dataState.refreshReportsList(formState.reportFilters)
      } catch (err) {
        console.error('Error deleting report:', err)
        setError('Failed to delete report: ' + (err.message || 'Unknown error'))
        setToast({ message: 'Failed to delete report.', type: 'error' })
      }
    },
    [dataState, formState.reportFilters]
  )

  const approvalQueueReports = useMemo(
    () => filterApprovalQueueReports(dataState.investigatedReports),
    [dataState.investigatedReports],
  )

  const displayedInvestigatedReports = isApprovalQueueMode ? approvalQueueReports : dataState.investigatedReports

  // ─── Filter handlers ───────────────────────────────────────────────────────

  const handleFilterApply = async (filters) => { 
    formState.setReportFilters(filters); 
    await dataState.refreshReportsList(filters) 
    modalsState.setIsFilterModalOpen(false)
  }

  const handleFilterClear = async () => {
    const cleared = { departmentId: '', status: '', severities: [], date: '' }
    formState.setReportFilters(cleared)
    await dataState.refreshReportsList(cleared)
    modalsState.setIsFilterModalOpen(false)
  }

  // ─── Report actions ────────────────────────────────────────────────────────

  const handleUpdateSuccess = async () => {
    setToast({ message: 'Report updated successfully', type: 'success' })
    modalsState.closeUpdateModal()
    await dataState.refreshReportsList()
  }

  const handleUpdateReport = async (event) => {
    if (event) event.preventDefault()

    if (!modalsState.selectedReport?.id) {
      updateFormState.setError('No report selected for update.')
      return { success: false }
    }

    if (!updateFormState.validate()) {
      return { success: false }
    }

    updateFormState.setIsSubmitting(true)
    updateFormState.setError(null)

    try {
      const payload = new FormData()
      payload.append('investigation_details', updateFormState.form.investigationDetails)
      payload.append('corrective_action', updateFormState.form.correctiveAction)
      payload.append('resolution_details', updateFormState.form.resolutionDetails)
      payload.append('verification_date', updateFormState.form.verificationDate)
      if (updateFormState.form.issueType) {
        payload.append('issue_type', updateFormState.form.issueType)
      }

      if (updateFormState.form.file) {
        payload.append('investigation_evidence', updateFormState.form.file)
      }

      await updateReportInvestigationMultipart(modalsState.selectedReport.id, payload)
      
      await handleUpdateSuccess()
      return { success: true }
    } catch (submitError) {
      updateFormState.setError(submitError?.message || 'Failed to update NCR report.')
      return { success: false }
    } finally {
      updateFormState.setIsSubmitting(false)
    }
  }

  const handlePreventiveRatingSubmit = async () => {
    if (!ratingReportId) return
    setIsSubmittingRating(true)
    try {
      await updateReport(ratingReportId, { 
        preventive_rating: preventiveRating,
        resolution_details: customResolution
      })

      if (currentUserId) {
        await dismissVerificationNotification(ratingReportId, currentUserId)
      }

      setToast({ message: 'Preventive action rated and resolution updated successfully!', type: 'success' })
      modalsState.setIsPreventiveActionModalOpen(false)
      await dataState.refreshReportsList()
    } catch (err) {
      setError(err?.message || 'Failed to submit rating and resolution.')
    } finally {
      setIsSubmittingRating(false)
    }
  }

  const handleAssignSuccess = async ({ selectedUser }) => {
    const name = selectedUser?.user_name || 'employee'
    const ref = modalsState.selectedAssignmentReport?.reference_no || 'report'
    setToast({ message: `Report ${ref} assigned to ${name}`, type: 'success' })
    modalsState.closeAssignModal()
    await dataState.refreshReportsList()
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
      if (normalized === 'reject') modalsState.closeRejectModal()
      await dataState.refreshReportsList()
    } catch (err) {
      setError(err?.message || 'Failed to review report.')
    } finally {
      setIsReviewSubmitting(false)
    }
  }

  // ─── Submit report ─────────────────────────────────────────────────────────



  const handleSubmitReport = async (event) => {
    event.preventDefault()
    setIsNcrSubmitting(true)
    try {
      setError(null)

      const resolvedProductType = await resolveCatalogSelection({
        inputValue: formState.createFormState.productType,
        selectedId: formState.createFormState.productTypeId,
        options: dataState.productTypeOptions,
        createFn: createProductType,
        optionLabelKey: 'label',
      })

      const resolvedLocation = await resolveCatalogSelection({
        inputValue: formState.createFormState.location,
        selectedId: formState.createFormState.locationId,
        options: dataState.locationOptions,
        createFn: createLocation,
        optionLabelKey: 'label',
      })

      const resolvedIssueType = await resolveCatalogSelection({
        inputValue: formState.createFormState.issueType,
        selectedId: formState.createFormState.issueTypeId,
        options: dataState.issueTypeOptions,
        createFn: createIssueType,
        optionLabelKey: 'label',
      })

      if (formState.evidenceState.evidenceFileMain) {
        if (!currentAuthId) throw new Error('Missing authenticated user. Please log in again.')
        const fd = new FormData()
        fd.append('product_type_id', resolvedProductType.id)
        fd.append('batch_number', formState.createFormState.batchNumber)
        fd.append('location_id', resolvedLocation.id)
        fd.append('severity', formState.createFormState.severity)
        fd.append('department_id', formState.createFormState.department)
        fd.append('description', formState.createFormState.description)
        fd.append('issue_type', resolvedIssueType.label)
        fd.append('issue_type_id', resolvedIssueType.id)
        fd.append('car_filed', 'false')
        fd.append('qddr_filed', 'false')
        if (formState.createFormState.clauseId) {
          fd.append('clause_id', formState.createFormState.clauseId)
        }
        fd.append('evidence', formState.evidenceState.evidenceFileMain)
        await submitNcrMultipart(fd, currentAuthId)
      } else {
        await createReport({
          product_type_id: resolvedProductType.id,
          batch_number: formState.createFormState.batchNumber,
          location_id: resolvedLocation.id,
          severity: formState.createFormState.severity,
          department_id: formState.createFormState.department,
          description: formState.createFormState.description,
          issue_type: resolvedIssueType.label,
          issue_type_id: resolvedIssueType.id,
          car_filed: false,
          qddr_filed: false,
          evidence_url: null,
          clause_id: formState.createFormState.clauseId || null,
        })
      }

      modalsState.setIsModalOpen(false)
      formState.clearEvidenceState()
      formState.resetCreateForm()
      await dataState.loadLookupData()
      await dataState.refreshReportsList()
    } catch (err) {
      setError(err?.message || 'Failed to submit NCR report.')
    } finally {
      setIsNcrSubmitting(false)
    }
  }

  const handleSubmitCAR = async (event) => {
    if (event) event.preventDefault()
    
    if (!carFormState.validate()) {
      return { success: false }
    }

    carFormState.setIsSubmitting(true)
    carFormState.setError(null)
    setError(null)

    try {
      // Build payload including confirmed ISO clause links and attached NCR ID
      const payload = {
        ...carFormState.form,
        clause_ids: carFormState.form.linked_clause_ids || [],
        ncr_ids: modalsState.selectedCARReport?.id
          ? [String(modalsState.selectedCARReport.id)]
          : carFormState.form.ncr_ids
      }
      
      await submitCarReport(payload, currentAuthId)
      
      setToast({ message: 'CAR report submitted successfully', type: 'success' })
      modalsState.closeCARModal()
      carFormState.resetForm()
      await dataState.refreshReportsList()
      await refreshCarAndQddrLists()
      return { success: true }
    } catch (submitError) {
      carFormState.setError(submitError?.message || 'Failed to submit CAR.')
      return { success: false }
    } finally {
      carFormState.setIsSubmitting(false)
    }
  }

  const handleSubmitQDDR = async (event) => {
    if (event) event.preventDefault()
    
    if (!qddrFormState.validate()) {
      return { success: false }
    }

    qddrFormState.setIsSubmitting(true)
    qddrFormState.setError(null)
    setError(null)

    try {
      // Build payload including NCR ID
      const payload = {
        ...qddrFormState.form,
        ncr_id: modalsState.selectedQDDRReport?.id
          ? modalsState.selectedQDDRReport.id
          : qddrFormState.form.ncr_id
      }
      
      await submitQddrReport(payload, currentAuthId)
      
      setToast({ message: 'QDDR report submitted successfully', type: 'success' })
      modalsState.closeQDDRModal()
      qddrFormState.resetForm()
      await dataState.refreshReportsList()
      await refreshCarAndQddrLists()
      return { success: true }
    } catch (submitError) {
      qddrFormState.setError(submitError?.message || 'Failed to submit QDDR.')
      return { success: false }
    } finally {
      qddrFormState.setIsSubmitting(false)
    }
  }

  const handleCapaSubmit = async (carId, data, userAuthId) => {
    try {
      const res = await submitCapaPlan(carId, data, userAuthId)
      await refreshCarAndQddrLists()
      carDetails.setSelectedCar(res)
      setToast({ message: 'CAPA plan submitted successfully', type: 'success' })
      return res
    } catch (err) {
      console.error('[useReportsLogic] handleCapaSubmit error:', err)
      throw err
    }
  }

  const handleCarVerify = async (carId, data, userAuthId) => {
    try {
      const res = await verifyCarPlan(carId, data, userAuthId)
      await refreshCarAndQddrLists()
      carDetails.setSelectedCar(res)
      setToast({ message: 'Verification recorded successfully', type: 'success' })
      return res
    } catch (err) {
      console.error('[useReportsLogic] handleCarVerify error:', err)
      throw err
    }
  }

  const handleOpenQddrDetails = (qddr) => {
    setSelectedQddr(qddr)
    setIsQddrDetailsModalOpen(true)
  }

  const handleCloseQddrDetails = () => {
    setSelectedQddr(null)
    setIsQddrDetailsModalOpen(false)
  }

  const handleUpdateQddr = async (qddrId, data, userAuthId) => {
    try {
      const res = await updateQddrReport(qddrId, data, userAuthId)
      await refreshCarAndQddrLists()
      setSelectedQddr(res.data || res)
      setToast({ message: 'QDDR report updated successfully', type: 'success' })
      return res
    } catch (err) {
      console.error('[useReportsLogic] handleUpdateQddr error:', err)
      throw err
    }
  }

  const assignModalState = useAssignReportModal({
    report: modalsState.selectedAssignmentReport,
    onSuccess: handleAssignSuccess,
    onClose: modalsState.closeAssignModal
  })

  const ncrSubmitModalState = useNCRSubmitModal({
    onSuccess: async () => {
      setToast({ message: 'Report submitted successfully', type: 'success' })
      modalsState.closeCreateModal()
      await dataState.refreshReportsList()
    },
    authUserId: currentAuthId
  })

  // ─── Returned API ──────────────────────────────────────────────────────────

  return {
    isLoading: dataState.isLoading,
    isReviewSubmitting,
    isNcrSubmitting,
    error,
    toast,
    setToast,

    activeTab,
    setActiveTab,
    carReports,
    loadingCar,
    qddrReports,
    loadingQddr,
    selectedCar: carDetails.selectedCar,
    isCarDetailsModalOpen: carDetails.isCarDetailsModalOpen,
    openCarDetails: carDetails.openCarDetails,
    closeCarDetails: carDetails.closeCarDetails,
    submitCapa: handleCapaSubmit,
    verifyCar: handleCarVerify,
    selectedQddr,
    isQddrDetailsModalOpen,
    openQddrDetails: handleOpenQddrDetails,
    closeQddrDetails: handleCloseQddrDetails,
    updateQddr: handleUpdateQddr,
    users: dataState.users.map(u => ({ id: u.id, label: `${u.user_name || 'Unnamed'} — ${u.role || u.role_name || 'Unknown'}` })),
    usersLoading: dataState.usersLoading,

    ...modalsState,
    
    reports: dataState.reports,
    investigatedReports: dataState.investigatedReports,
    closedReports: dataState.closedReports,
    displayedInvestigatedReports,
    approvalQueueReports,
    departments: dataState.departments,
    locationOptions: dataState.locationOptions,
    productTypeOptions: dataState.productTypeOptions,
    departmentNameById: dataState.departmentNameById,

    departmentsLoading: dataState.departmentsLoading,
    locationsLoading: dataState.locationsLoading,
    productTypesLoading: dataState.productTypesLoading,

    rejectReason,
    setRejectReason,

    isApprovalQueueMode, setIsApprovalQueueMode,
    isClosedMode, setIsClosedMode,

    createFormState: formState.createFormState,
    reportFilters: formState.reportFilters,
    setReportFilters: formState.setReportFilters,

    fileInputRefMain: formState.evidenceState.fileInputRefMain,
    evidenceFileMain: formState.evidenceState.evidenceFileMain,
    setEvidenceFileMain: formState.evidenceState.setEvidenceFileMain,
    evidencePreviewMain: formState.evidenceState.evidencePreviewMain,
    setEvidencePreviewMain: formState.evidenceState.setEvidencePreviewMain,
    evidenceErrorMain: formState.evidenceState.evidenceErrorMain,
    setEvidenceErrorMain: formState.evidenceState.setEvidenceErrorMain,

    canAssignReports,
    canUpdateReport,
    canDeleteReport,
    handleDeleteReport,

    handleFilterApply,
    handleFilterClear,
    handleUpdateSuccess,
    handleAssignSuccess,
    handleReviewReport,
    handleSubmitReport,

    // Bundled Modal Props for Clean Architecture (Prop Spreading)
    filterModalProps: {
      isOpen: modalsState.isFilterModalOpen,
      onClose: () => modalsState.setIsFilterModalOpen(false),
      filters: formState.reportFilters,
      setFilters: formState.setReportFilters,
      departments: dataState.departments,
      onClear: handleFilterClear,
      onApply: handleFilterApply,
      userRole,
    },
    updateModalProps: {
      isOpen: modalsState.isUpdateModalOpen,
      onClose: modalsState.closeUpdateModal,
      report: modalsState.selectedReport,
      form: updateFormState.form,
      previewUrl: updateFormState.previewUrl,
      setField: updateFormState.setField,
      handleFile: updateFormState.handleFile,
      errors: updateFormState.errors,
      error: updateFormState.error,
      isSubmitting: updateFormState.isSubmitting,
      handleSubmit: handleUpdateReport,
      deptName: dataState.departmentNameById.get(String(modalsState.selectedReport?.department_id || '')) || '—',
      issueTypeOptions: dataState.issueTypeOptions,
      issueTypesLoading: dataState.issueTypesLoading,
      suggestion: suggestionState.suggestion,
      isSuggesting: suggestionState.isSuggesting,
      suggestionError: suggestionState.suggestionError,
      loadSuggestion: suggestionState.loadSuggestion,
    },
    assignModalProps: {
      isOpen: modalsState.isAssignModalOpen,
      onClose: modalsState.closeAssignModal,
      report: modalsState.selectedAssignmentReport,
      onSuccess: handleAssignSuccess,
      ...assignModalState,
    },
    ncrSubmitModalProps: {
      isOpen: modalsState.isModalOpen,
      onClose: modalsState.closeCreateModal,
      ...ncrSubmitModalState,
    },
    createModalProps: {
      isOpen: modalsState.isModalOpen,
      onClose: modalsState.closeCreateModal,
      onSubmit: handleSubmitReport,
      error,
      isLoading: dataState.isLoading,
      createFormState: formState.createFormState,
      locationOptions: dataState.locationOptions,
      productTypeOptions: dataState.productTypeOptions,
      issueTypeOptions: dataState.issueTypeOptions,
      departments: dataState.departments,
      locationsLoading: dataState.locationsLoading,
      productTypesLoading: dataState.productTypesLoading,
      issueTypesLoading: dataState.issueTypesLoading,
      departmentsLoading: dataState.departmentsLoading,
      fileInputRef: formState.evidenceState.fileInputRefMain,
      evidenceFile: formState.evidenceState.evidenceFileMain,
      setEvidenceFile: formState.evidenceState.setEvidenceFileMain,
      evidencePreview: formState.evidenceState.evidencePreviewMain,
      setEvidencePreview: formState.evidenceState.setEvidencePreviewMain,
      evidenceError: formState.evidenceState.evidenceErrorMain,
      setEvidenceError: formState.evidenceState.setEvidenceErrorMain,
      clauses,
      clausesLoading,
      suggestingClause,
      handleSuggestClause,
    },
    rejectModalProps: {
      isOpen: modalsState.isRejectModalOpen,
      report: modalsState.rejectTargetReport,
      rejectReason,
      onReasonChange: setRejectReason,
      onClose: modalsState.closeRejectModal,
      onSubmit: handleReviewReport,
      isSubmitting: isReviewSubmitting,
    },
    preventiveActionModalProps: {
      isOpen: modalsState.isPreventiveActionModalOpen,
      onClose: () => modalsState.setIsPreventiveActionModalOpen(false),
      suggestedPreventiveAction,
      preventiveRating,
      onPreventiveRatingChange: setPreventiveRating,
      customResolution,
      onCustomResolutionChange: setCustomResolution,
      onSubmit: handlePreventiveRatingSubmit,
      isSubmitting: isSubmittingRating,
      report: ratingReportId 
        ? [...(dataState.reports || []), ...(dataState.investigatedReports || []), ...(dataState.closedReports || [])].find(r => String(r.id) === String(ratingReportId))
        : null
    },
    carModalProps: {
      isOpen: modalsState.isCARModalOpen,
      onClose: modalsState.closeCARModal,
      form: carFormState.form,
      handleChange: carFormState.handleChange,
      toggleNcrSelection: carFormState.toggleNcrSelection,
      toggleClauseSelection: carFormState.toggleClauseSelection,
      fetchClauseSuggestions: carFormState.fetchClauseSuggestions,
      clausesLoading: carFormState.clausesLoading,
      clausesError: carFormState.clausesError,
      userAuthId: currentAuthId,
      error: carFormState.error,
      isSubmitting: carFormState.isSubmitting,
      onSubmit: handleSubmitCAR,
      departments: dataState.departments.map(d => ({ id: d.id, label: d.department_name })),
      departmentsLoading: dataState.departmentsLoading,
      users: dataState.users.map(u => ({ id: u.id, label: `${u.user_name || 'Unnamed'} — ${u.role || u.role_name || 'Unknown'}` })),
      usersLoading: dataState.usersLoading,
      allReports: [...dataState.reports, ...dataState.closedReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    },
    qddrModalProps: {
      isOpen: modalsState.isQDDRModalOpen,
      onClose: modalsState.closeQDDRModal,
      form: qddrFormState.form,
      handleChange: qddrFormState.handleChange,
      selectNcr: qddrFormState.selectNcr,
      error: qddrFormState.error,
      isSubmitting: qddrFormState.isSubmitting,
      onSubmit: handleSubmitQDDR,
      locations: dataState.locationOptions,
      locationsLoading: dataState.locationsLoading,
      users: dataState.users.map(u => ({ id: u.id, label: `${u.user_name || 'Unnamed'} — ${u.role || u.role_name || 'Unknown'}` })),
      usersLoading: dataState.usersLoading,
      allReports: [...dataState.reports, ...dataState.closedReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      suggesting: qddrFormState.suggesting,
      suggestActions: qddrFormState.suggestActions,
    },
    carDetailsModalProps: {
      isOpen: carDetails.isCarDetailsModalOpen,
      onClose: carDetails.closeCarDetails,
      car: carDetails.selectedCar,
      onSubmitCapa: handleCapaSubmit,
      onVerify: handleCarVerify,
      userRole,
      authUserId: currentAuthId,
      rootCause: carDetails.rootCause,
      setRootCause: carDetails.setRootCause,
      correctiveAction: carDetails.correctiveAction,
      setCorrectiveAction: carDetails.setCorrectiveAction,
      preventiveAction: carDetails.preventiveAction,
      setPreventiveAction: carDetails.setPreventiveAction,
      verificationNotes: carDetails.verificationNotes,
      setVerificationNotes: carDetails.setVerificationNotes,
      submitting: carDetails.submitting,
      suggesting: carDetails.suggesting,
      error: carDetails.error,
      linkedClauses: carDetails.linkedClauses,
      loadingClauses: carDetails.loadingClauses,
      handleSuggestActions: carDetails.handleSuggestActions,
      handleCapaSubmit: (e) => carDetails.handleCapaSubmit(e, handleCapaSubmit, currentAuthId),
      handleVerificationSubmit: (outcome) => carDetails.handleVerificationSubmit(outcome, handleCarVerify, currentAuthId)
    }
  }
}