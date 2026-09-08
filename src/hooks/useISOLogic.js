import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useComplianceData } from './useISO/useComplianceData'
import { useISOModules } from './useISO/useISOModules'
import { useISOQDDRForm } from './useISO/useISOQDDRForm'
import { useISOTemplates } from './useISO/useISOTemplates'

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

  // 3. QDDR Modal form state & fix for clause suggestions
  const {
    qddrForm,
    isQddrModalOpen,
    setIsQddrModalOpen,
    isSubmittingQddr,
    qddrError,
    activeFinding,
    locations,
    users,
    allReports,
    loadingDropdowns,
    clausesLoading,
    clausesError,
    suggesting,
    suggestActions,
    loadDropdownOptions,
    handleQddrChange,
    selectNcr,
    toggleClauseSelection,
    fetchClauseSuggestions,
    handleOpenQddrModal,
    handleSubmitQDDR
  } = useISOQDDRForm({
    userName,
    userAuthId: currentAuthId,
    setToast,
    setCreatedCars,
    fetchComplianceData
  })

  // 4. ISO Templates logic
  const {
    isTemplatesModalOpen,
    loadingTemplates,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    fetchAndOpenTemplates,
    closeTemplatesModal
  } = useISOTemplates({ currentAuthId, setToast })

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

  const qddrModalProps = {
    isOpen: isQddrModalOpen,
    onClose: () => setIsQddrModalOpen(false),
    form: qddrForm,
    handleChange: handleQddrChange,
    selectNcr,
    toggleClauseSelection,
    fetchClauseSuggestions,
    clausesLoading,
    clausesError,
    userAuthId: currentAuthId,
    error: qddrError,
    isSubmitting: isSubmittingQddr,
    onSubmit: handleSubmitQDDR,
    locations,
    locationsLoading: loadingDropdowns,
    users,
    usersLoading: loadingDropdowns,
    allReports,
    suggesting,
    suggestActions
  }

  return {
    toast,
    setToast,

    isTemplatesModalOpen,
    loadingTemplates,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    fetchAndOpenTemplates,
    closeTemplatesModal,

    // Compliance stats
    overallScore,
    fetchActiveModules,
    compliantPct,
    partialPct,
    gapPct,
    nonCompliantFindings,
    createdCars,
    handleOpenQddrModal,
    setIsSelectionModalOpen,
    modulesModalProps,
    taskSelectionModalProps,
    qddrModalProps,
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
