import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useComplianceData } from './useISO/useComplianceData'
import { useISOModules } from './useISO/useISOModules'
import { useISOCARForm } from './useISO/useISOCARForm'

export default function useISOLogic({ userName }) {
  const { user: authUser } = useAuth()
  const currentAuthId = authUser?.id || ''

  const [toast, setToast] = useState(null)

  // 1. Compliance calculations & findings state
  const {
    compliantCount,
    partialCount,
    gapCount,
    overallScore,
    nonCompliantFindings,
    createdCars,
    setCreatedCars,
    fetchComplianceData
  } = useComplianceData()

  // 2. ISO modules & task actions logic
  const {
    isSelectionModalOpen,
    setIsSelectionModalOpen,
    isAuditTaskModalOpen,
    setIsAuditTaskModalOpen,
    isCapaTaskModalOpen,
    setIsCapaTaskModalOpen,
    isDocumentTaskModalOpen,
    setIsDocumentTaskModalOpen,
    isTrainingTaskModalOpen,
    setIsTrainingTaskModalOpen,
    activeModules,
    loadingModules,
    isModulesModalOpen,
    setIsModulesModalOpen,
    selectedModule,
    setSelectedModule,
    clauses,
    loadingClauses,
    fetchActiveModules,
    fetchClausesForModule,
    openAuditTask,
    openCapaTask,
    openDocumentTask,
    openTrainingTask,
    handleTaskCreation
  } = useISOModules({ setToast })

  // 3. CAR Modal form state & fix for clause suggestions
  const {
    carForm,
    isCarModalOpen,
    setIsCarModalOpen,
    isSubmittingCar,
    carError,
    activeFinding,
    departments,
    users,
    loadingDropdowns,
    clausesLoading,
    clausesError,
    loadDropdownOptions,
    handleCarChange,
    toggleNcrSelection,
    toggleClauseSelection,
    fetchClauseSuggestions,
    handleOpenCarModal,
    handleSubmitCAR
  } = useISOCARForm({
    userName,
    setToast,
    setCreatedCars,
    fetchComplianceData
  })

  // Load compliance and dropdown options on mount
  useEffect(() => {
    fetchComplianceData()
    loadDropdownOptions()
  }, [fetchComplianceData, loadDropdownOptions])

  // Aggregate derived stats
  const totalResults = compliantCount + partialCount + gapCount
  const compliantPct = totalResults > 0 ? Math.round((compliantCount / totalResults) * 100) : 100
  const partialPct = totalResults > 0 ? Math.round((partialCount / totalResults) * 100) : 0
  const gapPct = totalResults > 0 ? Math.round((gapCount / totalResults) * 100) : 0

  // Props formatting to be consumed by Modals in ISOPage.jsx
  const modulesModalProps = {
    isOpen: isModulesModalOpen,
    onClose: () => { setIsModulesModalOpen(false); setSelectedModule(null); },
    selectedModule,
    setSelectedModule,
    loadingClauses,
    clauses,
    loadingModules,
    activeModules,
    fetchClausesForModule
  }

  const taskSelectionModalProps = {
    isOpen: isSelectionModalOpen,
    onClose: () => setIsSelectionModalOpen(false),
    openAuditTask,
    openCapaTask,
    openDocumentTask,
    openTrainingTask
  }

  const carModalProps = {
    isOpen: isCarModalOpen,
    onClose: () => setIsCarModalOpen(false),
    form: carForm,
    handleChange: handleCarChange,
    toggleNcrSelection,
    toggleClauseSelection,
    fetchClauseSuggestions,
    clausesLoading,
    clausesError,
    userAuthId: currentAuthId,
    error: carError,
    isSubmitting: isSubmittingCar,
    onSubmit: handleSubmitCAR,
    departments,
    departmentsLoading: loadingDropdowns,
    users,
    usersLoading: loadingDropdowns,
    allReports: []
  }

  return {
    toast,
    setToast,
    overallScore,
    fetchActiveModules,
    compliantPct,
    partialPct,
    gapPct,
    nonCompliantFindings,
    createdCars,
    handleOpenCarModal,
    setIsSelectionModalOpen,
    modulesModalProps,
    taskSelectionModalProps,
    carModalProps,
    isAuditTaskModalOpen,
    setIsAuditTaskModalOpen,
    isCapaTaskModalOpen,
    setIsCapaTaskModalOpen,
    isDocumentTaskModalOpen,
    setIsDocumentTaskModalOpen,
    isTrainingTaskModalOpen,
    setIsTrainingTaskModalOpen,
    handleTaskCreation
  }
}
