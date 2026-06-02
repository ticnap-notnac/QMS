import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createReport, reviewReportApproval, submitNcrMultipart } from '@/services/ncrService'
import { createLocation } from '@/services/locationService'
import { createProductType } from '@/services/productTypeService'

import { useReportsData } from './useReports/useReportsData'
import { useReportsForm } from './useReports/useReportsForm'
import { useReportsModals } from './useReports/useReportsModals'
import { useReportsUpdateForm } from './useReports/useReportsUpdateForm'
import { useCARForm } from './useReports/useCARForm'
import { useQDDRForm } from './useReports/useQDDRForm'
import useAssignReportModal from './useReports/useAssignReportModal'
import useNCRSubmitModal from './useReports/useNCRSubmitModal'
import { updateReportInvestigationMultipart } from '@/services/ncrService'
import { submitCarReport } from '@/services/carService'
import { submitQddrReport } from '@/services/qddrService'

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReportsLogic({ currentUserId, userRole, authUserId }) {
  const { user: authUser } = useAuth()
  const currentAuthId = authUser?.id || authUserId || ''

  // ── Async / UI state ────────────────────────────────────────────────────────
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── View mode ───────────────────────────────────────────────────────────────
  const [isApprovalQueueMode, setIsApprovalQueueMode] = useState(false)
  const [isClosedMode, setIsClosedMode] = useState(false)

  // ── Sub-hooks ───────────────────────────────────────────────────────────────
  const formState = useReportsForm()
  
  const dataState = useReportsData({
    currentUserId,
    currentAuthId,
    reportFilters: formState.reportFilters,
    setError
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

  const carFormState = useCARForm()
  const qddrFormState = useQDDRForm()

  // ─── Derived / memoised ────────────────────────────────────────────────────

  const canAssignReports = useMemo(
    () => ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase()),
    [userRole],
  )

  const canUpdateReport = useCallback(
    (report) => {
      if (!report) return false
      if (canAssignReports) return true
      return String(report.assigned_to || '') !== '' &&
        String(report.assigned_to) === String(currentAuthId)
    },
    [canAssignReports, currentAuthId],
  )

  const approvalQueueReports = useMemo(
    () =>
      (dataState.investigatedReports || []).filter(
        (r) => Boolean(r?.investigation_details) && String(r?.status || '').trim().toLowerCase() !== 'closed',
      ),
    [dataState.investigatedReports],
  )

  const displayedInvestigatedReports = isApprovalQueueMode ? approvalQueueReports : dataState.investigatedReports

  // ─── Filter handlers ───────────────────────────────────────────────────────

  const handleFilterApply = async (filters) => { 
    formState.setReportFilters(filters); 
    await dataState.refreshReportsList(filters) 
  }

  const handleFilterClear = async () => {
    const cleared = { departmentId: '', status: '', severities: [], date: '' }
    formState.setReportFilters(cleared)
    await dataState.refreshReportsList(cleared)
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
      payload.append('resolution_time_value', updateFormState.form.resolutionTimeValue)
      payload.append('resolution_time_unit', updateFormState.form.resolutionTimeUnit)
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

      if (formState.evidenceState.evidenceFileMain) {
        if (!currentAuthId) throw new Error('Missing authenticated user. Please log in again.')
        const fd = new FormData()
        fd.append('product_type_id', resolvedProductType.id)
        fd.append('batch_number', formState.createFormState.batchNumber)
        fd.append('location_id', resolvedLocation.id)
        fd.append('severity', formState.createFormState.severity)
        fd.append('department_id', formState.createFormState.department)
        fd.append('description', formState.createFormState.description)
        fd.append('issue_type', formState.createFormState.issueType || 'ncr')
        fd.append('car_filed', 'false')
        fd.append('qddr_filed', 'false')
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
          issue_type: formState.createFormState.issueType || 'ncr',
          car_filed: false,
          qddr_filed: false,
          evidence_url: null,
        })
      }

      modalsState.setIsModalOpen(false)
      formState.clearEvidenceState()
      formState.resetCreateForm()
      await dataState.loadLookupData()
      await dataState.refreshReportsList()
    } catch (err) {
      setError(err?.message || 'Failed to submit NCR report.')
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
      // If we launched the CAR from an NCR, attach its ID
      if (modalsState.selectedCARReport?.id) {
        carFormState.form.ncr_ids = [String(modalsState.selectedCARReport.id)]
      }
      
      await submitCarReport(carFormState.form, currentAuthId)
      
      setToast({ message: 'CAR report submitted successfully', type: 'success' })
      modalsState.closeCARModal()
      carFormState.resetForm()
      await dataState.refreshReportsList()
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
      // If we launched QDDR from an NCR, attach its ID
      if (modalsState.selectedQDDRReport?.id) {
        qddrFormState.form.ncr_id = modalsState.selectedQDDRReport.id
      }
      
      await submitQddrReport(qddrFormState.form, currentAuthId)
      
      setToast({ message: 'QDDR report submitted successfully', type: 'success' })
      modalsState.closeQDDRModal()
      qddrFormState.resetForm()
      await dataState.refreshReportsList()
      return { success: true }
    } catch (submitError) {
      qddrFormState.setError(submitError?.message || 'Failed to submit QDDR.')
      return { success: false }
    } finally {
      qddrFormState.setIsSubmitting(false)
    }
  }

  const assignModalState = useAssignReportModal({
    report: modalsState.selectedAssignmentReport,
    onSuccess: handleAssignSuccess,
    onClose: modalsState.closeAssignModal
  })

  const ncrSubmitModalState = useNCRSubmitModal({
    onSuccess: async (data) => {
      setToast({ message: 'Report submitted successfully', type: 'success' })
      modalsState.closeCreateModal()
      await dataState.refreshReportsList()
    }
  })

  // ─── Returned API ──────────────────────────────────────────────────────────

  return {
    isLoading: dataState.isLoading,
    isReviewSubmitting,
    error,
    toast,
    setToast,

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

    fileInputRefMain: formState.evidenceState.fileInputRefMain,
    evidenceFileMain: formState.evidenceState.evidenceFileMain,
    setEvidenceFileMain: formState.evidenceState.setEvidenceFileMain,
    evidencePreviewMain: formState.evidenceState.evidencePreviewMain,
    setEvidencePreviewMain: formState.evidenceState.setEvidencePreviewMain,
    evidenceErrorMain: formState.evidenceState.evidenceErrorMain,
    setEvidenceErrorMain: formState.evidenceState.setEvidenceErrorMain,

    canAssignReports,
    canUpdateReport,

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
      onApplyFilters: handleFilterApply,
      onClearFilters: handleFilterClear,
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
      departments: dataState.departments,
      locationsLoading: dataState.locationsLoading,
      productTypesLoading: dataState.productTypesLoading,
      departmentsLoading: dataState.departmentsLoading,
      fileInputRef: formState.evidenceState.fileInputRefMain,
      evidenceFile: formState.evidenceState.evidenceFileMain,
      setEvidenceFile: formState.evidenceState.setEvidenceFileMain,
      evidencePreview: formState.evidenceState.evidencePreviewMain,
      setEvidencePreview: formState.evidenceState.setEvidencePreviewMain,
      evidenceError: formState.evidenceState.evidenceErrorMain,
      setEvidenceError: formState.evidenceState.setEvidenceErrorMain,
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
      preventiveRating: formState.createFormState.preventiveRating,
      onPreventiveRatingChange: formState.createFormState.setPreventiveRating,
    },
    detailModalProps: {
      report: modalsState.detailReport,
      currentAuthId,
      canUpdateReport,
      departmentNameById: dataState.departmentNameById,
      onClose: modalsState.closeDetailView,
    },
    carModalProps: {
      isOpen: modalsState.isCARModalOpen,
      onClose: modalsState.closeCARModal,
      form: carFormState.form,
      handleChange: carFormState.handleChange,
      toggleNcrSelection: carFormState.toggleNcrSelection,
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
      allReports: [...dataState.reports, ...dataState.closedReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
  }
}