import { useCallback, useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { isAdminRole } from '@/utils/roleUtils.js'
import { useAuth } from '@/hooks/useAuth'
import { useReportsData } from './useReports/useReportsData'
import { useReportsForm } from './useReports/useReportsForm'
import { useReportsModals } from './useReports/useReportsModals'
import { useCARForm } from './useReports/useCARForm'
import { useQDDRForm } from './useReports/useQDDRForm'
import {
  submitCarReport,
  submitCapaPlan,
  verifyCarPlan,
  updateCarReport,
  fetchLinkedClausesForCar,
  fetchCarReportById,
  rateCarReport
} from '@/services/carService'
import {
  submitQddrReport,
  updateQddrReport,
  editQddrReport,
  rateQddrReport
} from '@/services/qddrService'
import { supabase } from '@/utils/supabase'
import { useCARDetails } from './useCARDetails'

export function useReportsLogic({ currentUserId, userRole, userPermissions, authUserId, userDepartmentId }) {
  const { user: authUser } = useAuth()
  const currentAuthId = authUser?.id || authUserId || ''

  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  // ── View mode & Tab Navigation ─────────────────────────────────────────────
  const location = useLocation()
  const initialTab =
    location?.pathname?.includes('reports') &&
    location?.state?.tab &&
    ['car', 'qddr'].includes(location.state.tab)
      ? location.state.tab
      : 'car'

  const [isClosedMode, setIsClosedMode] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (location?.state?.tab && ['car', 'qddr'].includes(location.state.tab)) {
      setActiveTab(location.state.tab)
      if (location.state.isClosed !== undefined) {
        setIsClosedMode(Boolean(location.state.isClosed))
      }
    }
  }, [location?.state?.tab, location?.state?.isClosed])

  // ── CAR & QDDR Reports lists state ─────────────────────────────────────────
  const [carReports, setCarReports] = useState([])
  const [loadingCar, setLoadingCar] = useState(false)
  const [qddrReports, setQddrReports] = useState([])
  const [loadingQddr, setLoadingQddr] = useState(false)

  // ── Detail Modals state ────────────────────────────────────────────────────
  const carDetails = useCARDetails()
  const [selectedQddr, setSelectedQddr] = useState(null)
  const [isQddrDetailsModalOpen, setIsQddrDetailsModalOpen] = useState(false)

  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const formState = useReportsForm()
  const dataState = useReportsData({ currentAuthId, setError })
  const modalsState = useReportsModals()
  const carFormState = useCARForm(dataState.departments)
  const qddrFormState = useQDDRForm()

  const activeUserOptions = useMemo(
    () =>
      dataState.users
        .filter(u => String(u.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
        .map(u => ({
          id: u.id,
          label: `${u.user_name || 'Unnamed'} — ${u.role || u.role_name || 'Unknown'}`
        })),
    [dataState.users]
  )

  // ── Load & Filter CAR and QDDR Reports ────────────────────────────────────
  const refreshCarAndQddrLists = useCallback(async () => {
    setLoadingCar(true)
    setLoadingQddr(true)
    try {
      const [carRes, qddrRes, ratingsRes] = await Promise.all([
        supabase
          .from('car_reports')
          .select('*, audit_schedules(id, title, scheduled_date)')
          .order('created_at', { ascending: false }),
        supabase
          .from('qddr_reports')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('report_ratings')
          .select('report_type, report_id, user_auth_id, rating')
      ])

      if (carRes.error) throw carRes.error
      if (qddrRes.error) throw qddrRes.error

      const allRatings = !ratingsRes.error && Array.isArray(ratingsRes.data) ? ratingsRes.data : []
      const ratingStatsMap = new Map()
      for (const row of allRatings) {
        const key = `${String(row.report_type || '').toUpperCase()}_${row.report_id}`
        if (!ratingStatsMap.has(key)) {
          ratingStatsMap.set(key, { sum: 0, count: 0, myRating: null })
        }
        const entry = ratingStatsMap.get(key)
        const val = Number(row.rating)
        if (val >= 1 && val <= 5) {
          entry.sum += val
          entry.count += 1
          if (currentAuthId && String(row.user_auth_id) === String(currentAuthId)) {
            entry.myRating = val
          }
        }
      }

      const enrichWithRatings = (item, reportType) => {
        const stats = ratingStatsMap.get(`${reportType}_${item.id}`)
        const count = stats?.count ?? Number(item.ratings_count || 0)
        const avg = stats && stats.count > 0
          ? Number((stats.sum / stats.count).toFixed(2))
          : (item.average_rating != null ? Number(item.average_rating) : null)
        return {
          ...item,
          my_rating: stats?.myRating ?? item.my_rating ?? null,
          average_rating: avg,
          ratings_count: count,
        }
      }

      const normRole = String(userRole || '').trim().toLowerCase()
      const pagesList = Array.isArray(userPermissions?.pages) ? userPermissions.pages : []
      const rightsList = Array.isArray(userPermissions?.rights) ? userPermissions.rights : []
      const isCrossDepartmentRole =
        isAdminRole(userRole) ||
        ['auditor', 'qa officer', 'quality assurance'].includes(normRole) ||
        pagesList.includes('audit_tools') ||
        pagesList.includes('iso') ||
        rightsList.includes('manage_iso') ||
        rightsList.includes('edit_delete_report')
      const isStandardUser = !isCrossDepartmentRole
      const activeDeptFilterId = formState.reportFilters.departmentId
      const currentUserObj = (dataState.users || []).find(u => Number(u.id) === Number(currentUserId))
      const currentUserName = String(currentUserObj?.label || '').split(/\s+[—–-]\s+/)[0].trim().toLowerCase()

      // 1. CAR department scoping & filtering
      let filteredCars = carRes.data || []
      if (isStandardUser) {
        const userDeptName = dataState.departmentNameById.get(String(userDepartmentId))?.toLowerCase()
        filteredCars = filteredCars.filter(car => {
          if (String(car.prepared_by_audited_by) === String(currentUserId)) return true
          if (currentUserName) {
            const reqName = String(car.requestor || '').split(/\s+[—–-]\s+/)[0].trim().toLowerCase()
            const recName = String(car.recipient || '').split(/\s+[—–-]\s+/)[0].trim().toLowerCase()
            if (reqName === currentUserName || recName === currentUserName) return true
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
        filteredCars = filteredCars.filter(car => {
          if (filterDeptName) {
            return (
              car.requesting_department?.toLowerCase() === filterDeptName ||
              car.responsible_department?.toLowerCase() === filterDeptName
            )
          }
          return false
        })
      }

      if (formState.reportFilters?.status) {
        const targetStatus = String(formState.reportFilters.status).trim().toLowerCase()
        filteredCars = filteredCars.filter(car => String(car.status || '').trim().toLowerCase() === targetStatus)
      }
      if (formState.reportFilters?.date) {
        filteredCars = filteredCars.filter(car => String(car.created_at || '').startsWith(formState.reportFilters.date))
      }
      setCarReports(filteredCars.map(car => enrichWithRatings(car, 'CAR')))

      // 2. QDDR department scoping & filtering
      let filteredQddrs = qddrRes.data || []
      if (isStandardUser) {
        const userDeptName = dataState.departmentNameById.get(String(userDepartmentId))?.toLowerCase()
        filteredQddrs = filteredQddrs.filter(q => {
          if (
            String(q.reported_by) === String(currentUserId) ||
            String(q.leader) === String(currentUserId) ||
            String(q.approved_by) === String(currentUserId) ||
            String(q.noted_by) === String(currentUserId)
          ) {
            return true
          }
          if (userDeptName && q.issuing_department) {
            return q.issuing_department.toLowerCase() === userDeptName
          }
          return false
        })
      } else if (activeDeptFilterId) {
        const filterDeptName = dataState.departmentNameById.get(String(activeDeptFilterId))?.toLowerCase()
        filteredQddrs = filteredQddrs.filter(q => {
          if (filterDeptName && q.issuing_department) {
            return q.issuing_department.toLowerCase() === filterDeptName
          }
          return false
        })
      }

      if (formState.reportFilters?.status) {
        const targetStatus = String(formState.reportFilters.status).trim().toLowerCase()
        filteredQddrs = filteredQddrs.filter(q => String(q.status || '').trim().toLowerCase() === targetStatus)
      }
      if (formState.reportFilters?.date) {
        filteredQddrs = filteredQddrs.filter(q => String(q.created_at || '').startsWith(formState.reportFilters.date))
      }
      setQddrReports(filteredQddrs.map(q => enrichWithRatings(q, 'QDDR')))
    } catch (err) {
      setToast({ message: 'We could not load the CAR/QDDR lists. Please refresh the page.', type: 'error' })
    } finally {
      setLoadingCar(false)
      setLoadingQddr(false)
    }
  }, [
    currentAuthId,
    currentUserId,
    userRole,
    userPermissions,
    userDepartmentId,
    formState.reportFilters.departmentId,
    formState.reportFilters.status,
    formState.reportFilters.date,
    dataState.departmentNameById,
    dataState.users
  ])

  useEffect(() => {
    if (currentAuthId) {
      const timer = setTimeout(() => {
        refreshCarAndQddrLists()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [currentAuthId, refreshCarAndQddrLists])

  // Auto-open CAR details when navigated via ?openCar=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const openCarId = params.get('openCar')
    if (!openCarId) return

    const loadCar = async () => {
      let carObj = (carReports || []).find((car) => String(car.id) === String(openCarId)) || null

      if (!carObj && currentAuthId) {
        try {
          carObj = await fetchCarReportById(openCarId, currentAuthId)
        } catch (err) {
          console.warn('Failed to load CAR by ID from API:', err)
        }
      }

      if (carObj) {
        carDetails.openCarDetails(carObj)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    const timer = setTimeout(loadCar, 300)
    return () => clearTimeout(timer)
  }, [carReports, carDetails, currentAuthId])

  // ── Filter Handlers ────────────────────────────────────────────────────────
  const handleFilterApply = async (filters) => {
    formState.setReportFilters(filters)
    modalsState.setIsFilterModalOpen(false)
  }

  const handleFilterClear = async () => {
    const cleared = { departmentId: '', status: '', severities: [], date: '' }
    formState.setReportFilters(cleared)
    modalsState.setIsFilterModalOpen(false)
  }

  // ── CAR & QDDR Submission & Edit Handlers ──────────────────────────────────
  const handleSubmitCAR = async (event) => {
    if (event) event.preventDefault()

    if (!carFormState.validate()) {
      return { success: false }
    }

    carFormState.setIsSubmitting(true)
    carFormState.setError(null)

    try {
      const payload = {
        ...carFormState.form,
        clause_ids: carFormState.form.linked_clause_ids || []
      }

      if (carFormState.form.id) {
        await updateCarReport(carFormState.form.id, payload, currentAuthId)
        setToast({ message: 'CAR report updated successfully', type: 'success' })
      } else {
        await submitCarReport(payload, currentAuthId)
        setToast({ message: 'CAR report submitted successfully', type: 'success' })
      }

      modalsState.closeCARModal()
      carFormState.resetForm()
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

    try {
      const finalEvidenceUrls = []
      for (const item of qddrFormState.evidenceItems || []) {
        if (item.isExisting && item.url) {
          finalEvidenceUrls.push(item.url)
        } else if (item.file) {
          const fileExt = item.file.name.split('.').pop() || 'bin'
          const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
          const filePath = `qddr/${safeName}`

          const { error: uploadErr } = await supabase.storage
            .from('audit-evidence')
            .upload(filePath, item.file)

          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from('audit-evidence')
              .getPublicUrl(filePath)
            if (urlData?.publicUrl) {
              finalEvidenceUrls.push(urlData.publicUrl)
              continue
            }
          }

          // Fallback if storage bucket policy is not yet active for client uploads
          if (item.file.type?.startsWith('image/') && qddrFormState.fileOrDataUrlToBase64) {
            const converted = await qddrFormState.fileOrDataUrlToBase64(item.file)
            if (converted?.base64) {
              finalEvidenceUrls.push(`data:${converted.mimeType};base64,${converted.base64}`)
            }
          }
        }
      }

      const now = new Date()
      const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      const isEdit = Boolean(qddrFormState.form.id)
      const payload = {
        ...qddrFormState.form,
        date: isEdit ? (qddrFormState.form.date || currentDate) : currentDate,
        time: isEdit ? (qddrFormState.form.time || currentTime) : currentTime,
        evidence_urls: finalEvidenceUrls
      }

      if (qddrFormState.form.id) {
        await editQddrReport(qddrFormState.form.id, payload, currentAuthId)
        setToast({ message: 'QDDR report updated successfully', type: 'success' })
      } else {
        await submitQddrReport(payload, currentAuthId)
        setToast({ message: 'QDDR report submitted successfully', type: 'success' })
      }

      modalsState.closeQDDRModal()
      qddrFormState.resetForm()
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
      setToast({ message: err?.message || 'Failed to submit CAPA plan.', type: 'error' })
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
      setToast({ message: err?.message || 'Failed to verify CAR.', type: 'error' })
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
      setToast({ message: err?.message || 'Failed to update QDDR.', type: 'error' })
      throw err
    }
  }

  const openEditCarModal = async (car) => {
    try {
      const linkedClauses = await fetchLinkedClausesForCar(car.id)
      const linkedClauseIds = linkedClauses.map(c => c.clause_id)
      carFormState.initForm({
        ...car,
        linked_clause_ids: linkedClauseIds,
        suggested_clauses: linkedClauses.map(c => ({ ...c, confidence: 1 }))
      })
      modalsState.openCARModal(car)
    } catch (err) {
      console.error('Failed to fetch linked clauses for CAR edit:', err)
      carFormState.initForm(car)
      modalsState.openCARModal(car)
    }
  }

  const openEditQddrModal = (qddr) => {
    const resolveUserDropdownLabel = (val) => {
      if (!val) return ''
      const found = (dataState.users || []).find(u => Number(u.id) === Number(val))
      return found ? `${found.user_name || 'Unnamed'} — ${found.role || found.role_name || 'Unknown'}` : String(val)
    }

    const hydratedQddr = {
      ...qddr,
      leader: resolveUserDropdownLabel(qddr.leader),
      approved_by: resolveUserDropdownLabel(qddr.approved_by),
      noted_by: resolveUserDropdownLabel(qddr.noted_by),
    }

    qddrFormState.initForm(hydratedQddr)
    modalsState.openQDDRModal(qddr)
  }

  const handleRateCar = async (carId, rating) => {
    try {
      const res = await rateCarReport(carId, rating, currentAuthId)
      const updatedFields = {
        my_rating: res?.my_rating ?? rating,
        average_rating: res?.average_rating ?? rating,
        ratings_count: res?.ratings_count ?? 1
      }
      setCarReports(prev =>
        prev.map(c => (Number(c.id) === Number(carId) ? { ...c, ...updatedFields } : c))
      )
      if (carDetails.selectedCar && Number(carDetails.selectedCar.id) === Number(carId)) {
        carDetails.setSelectedCar(prev => (prev ? { ...prev, ...updatedFields } : prev))
      }
      setToast({ message: `Rated CAR ${rating}/5 stars`, type: 'success' })
      return res
    } catch (err) {
      setToast({ message: err?.message || 'Failed to save rating.', type: 'error' })
      throw err
    }
  }

  const handleRateQddr = async (qddrId, rating) => {
    try {
      const res = await rateQddrReport(qddrId, rating, currentAuthId)
      const updatedFields = {
        my_rating: res?.my_rating ?? rating,
        average_rating: res?.average_rating ?? rating,
        ratings_count: res?.ratings_count ?? 1
      }
      setQddrReports(prev =>
        prev.map(q => (Number(q.id) === Number(qddrId) ? { ...q, ...updatedFields } : q))
      )
      if (selectedQddr && Number(selectedQddr.id) === Number(qddrId)) {
        setSelectedQddr(prev => (prev ? { ...prev, ...updatedFields } : prev))
      }
      setToast({ message: `Rated QDDR ${rating}/5 stars`, type: 'success' })
      return res
    } catch (err) {
      setToast({ message: err?.message || 'Failed to save rating.', type: 'error' })
      throw err
    }
  }

  return {
    toast,
    setToast,
    error,

    activeTab,
    setActiveTab,
    isClosedMode,
    setIsClosedMode,

    carReports,
    loadingCar,
    qddrReports,
    loadingQddr,
    refreshCarAndQddrLists,

    selectedCar: carDetails.selectedCar,
    isCarDetailsModalOpen: carDetails.isCarDetailsModalOpen,
    openCarDetails: carDetails.openCarDetails,
    closeCarDetails: carDetails.closeCarDetails,
    submitCapa: handleCapaSubmit,
    verifyCar: handleCarVerify,
    handleRateCar,

    selectedQddr,
    isQddrDetailsModalOpen,
    openQddrDetails: handleOpenQddrDetails,
    closeQddrDetails: handleCloseQddrDetails,
    updateQddr: handleUpdateQddr,
    handleRateQddr,

    users: activeUserOptions,
    usersLoading: dataState.usersLoading,
    departments: dataState.departments,
    departmentNameById: dataState.departmentNameById,
    userNameById: dataState.userNameById,

    openEditCarModal,
    openEditQddrModal,
    ...modalsState,

    reportFilters: formState.reportFilters,
    setReportFilters: formState.setReportFilters,
    handleFilterApply,
    handleFilterClear,

    filterModalProps: {
      isOpen: modalsState.isFilterModalOpen,
      onClose: () => modalsState.setIsFilterModalOpen(false),
      filters: formState.reportFilters,
      setFilters: formState.setReportFilters,
      departments: dataState.departments,
      onClear: handleFilterClear,
      onApply: handleFilterApply,
      userRole,
      userPermissions,
    },
    carModalProps: {
      isOpen: modalsState.isCARModalOpen,
      onClose: () => {
        modalsState.closeCARModal()
        carFormState.resetForm()
      },
      form: carFormState.form,
      handleChange: carFormState.handleChange,
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
      users: activeUserOptions,
      usersLoading: dataState.usersLoading,
      nonConformanceTypes: dataState.nonConformanceTypeOptions,
      nonConformanceTypesLoading: dataState.issueTypesLoading
    },
    qddrModalProps: {
      isOpen: modalsState.isQDDRModalOpen,
      onClose: () => {
        modalsState.closeQDDRModal()
        qddrFormState.resetForm()
      },
      form: qddrFormState.form,
      handleChange: qddrFormState.handleChange,
      error: qddrFormState.error,
      isSubmitting: qddrFormState.isSubmitting,
      onSubmit: handleSubmitQDDR,
      locations: dataState.locationOptions,
      locationsLoading: dataState.locationsLoading,
      users: activeUserOptions,
      usersLoading: dataState.usersLoading,
      suggesting: qddrFormState.suggesting,
      suggestActions: qddrFormState.suggestActions,
      generatingReason: qddrFormState.generatingReason,
      generateReasonFromEvidence: qddrFormState.generateReasonFromEvidence,
      scanningLabel: qddrFormState.scanningLabel,
      scanMessage: qddrFormState.scanMessage,
      handleScanLabel: qddrFormState.handleScanLabel,
      evidenceItems: qddrFormState.evidenceItems,
      evidenceError: qddrFormState.evidenceError,
      handleEvidenceFiles: qddrFormState.handleEvidenceFiles,
      removeEvidenceFile: qddrFormState.removeEvidenceFile
    },
    carDetailsModalProps: {
      isOpen: carDetails.isCarDetailsModalOpen,
      onClose: carDetails.closeCarDetails,
      car: carDetails.selectedCar,
      onSubmitCapa: handleCapaSubmit,
      onVerify: handleCarVerify,
      userRole,
      userPermissions,
      userDepartmentId,
      authUserId: currentAuthId,
      rootCause: carDetails.rootCause,
      setRootCause: carDetails.setRootCause,
      rcaMethod: carDetails.rcaMethod,
      setRcaMethod: carDetails.setRcaMethod,
      fiveWhys: carDetails.fiveWhys,
      handleFiveWhyChange: carDetails.handleFiveWhyChange,
      fishbone: carDetails.fishbone,
      handleFishboneChange: carDetails.handleFishboneChange,
      rootCauseSummary: carDetails.rootCauseSummary,
      handleRootCauseSummaryChange: carDetails.handleRootCauseSummaryChange,
      correctiveAction: carDetails.correctiveAction,
      setCorrectiveAction: carDetails.setCorrectiveAction,
      preventiveAction: carDetails.preventiveAction,
      setPreventiveAction: carDetails.setPreventiveAction,
      targetVerificationDate: carDetails.targetVerificationDate,
      setTargetVerificationDate: carDetails.setTargetVerificationDate,
      verificationNotes: carDetails.verificationNotes,
      setVerificationNotes: carDetails.setVerificationNotes,
      verificationRating: carDetails.verificationRating,
      setVerificationRating: carDetails.setVerificationRating,
      userDepartmentName: dataState.departmentNameById.get(String(userDepartmentId)) || '',
      submitting: carDetails.submitting,
      suggesting: carDetails.suggesting,
      suggestionMeta: carDetails.suggestionMeta,
      error: carDetails.error,
      linkedClauses: carDetails.linkedClauses,
      loadingClauses: carDetails.loadingClauses,
      handleSuggestActions: carDetails.handleSuggestActions,
      handleCapaSubmit: (e) => carDetails.handleCapaSubmit(e, handleCapaSubmit, currentAuthId),
      handleVerificationSubmit: (outcome) => carDetails.handleVerificationSubmit(outcome, handleCarVerify, currentAuthId)
    }
  }
}
