import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createReport, reviewReportApproval, submitNcrMultipart } from '@/services/ncrService'
import { createLocation } from '@/services/locationService'
import { createProductType } from '@/services/productTypeService'

import { useReportsData } from './useReports/useReportsData'
import { useReportsForm } from './useReports/useReportsForm'
import { useReportsModals } from './useReports/useReportsModals'

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
      onSuccess: handleUpdateSuccess,
    },
    assignModalProps: {
      isOpen: modalsState.isAssignModalOpen,
      onClose: modalsState.closeAssignModal,
      report: modalsState.selectedAssignmentReport,
      onSuccess: handleAssignSuccess,
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
  }
}