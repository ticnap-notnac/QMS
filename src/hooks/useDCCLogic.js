import { useEffect } from 'react'
import { useDCCFolderNav } from './useDCC/useDCCFolderNav'
import { useDCCISO } from './useDCC/useDCCISO'
import { useDCCTaskReports } from './useDCC/useDCCTaskReports'
import { useCARDetails } from './useCARDetails'
import { useAuditRunDetails } from './useAuditRunDetails'

export function useDCCLogic() {
  // 1. Folder Navigation & Search Query state
  const folderNav = useDCCFolderNav()
  const { selectedFolder, openFolder, closeFolder, openTaskFolder, closeTaskFolder, setSearchQuery } = folderNav

  // 2. ISO Standards & Clauses checklist logic
  const iso = useDCCISO()
  const { loadActiveStandards, openStandard, closeStandard, setSelectedStandard, setClauses } = iso

  // 3. CAR Modal details state
  const carDetails = useCARDetails()

  // Audit Run Details modal logic
  const auditRunDetails = useAuditRunDetails()

  // 4. Completed Task Reports logic
  const taskReports = useDCCTaskReports({ carDetails })
  const {
    clearAllReports,
    loadClosedNCRs,
    loadClosedCARs,
    loadClosedQDDRs,
    loadClosedAudits,
    loadAuditSchedules
  } = taskReports

  // Load ISO standards whenever the iso_modules folder is opened
  useEffect(() => {
    if (selectedFolder?.id === 'iso_modules') {
      loadActiveStandards()
    }
  }, [selectedFolder, loadActiveStandards])

  // Helper to clear all loaded data when navigating standard folders
  const handleFolderClearState = () => {
    setSelectedStandard(null)
    setClauses([])
    clearAllReports()
  }

  // Load reports based on clicked subfolder
  const handleLoadReports = (subfolder) => {
    clearAllReports()
    if (subfolder.id === 'ncr') {
      loadClosedNCRs()
    } else if (subfolder.id === 'car') {
      loadClosedCARs()
    } else if (subfolder.id === 'qddr') {
      loadClosedQDDRs()
    } else if (subfolder.id === 'audit') {
      loadClosedAudits()
    } else if (subfolder.id === 'audit_schedules') {
      loadAuditSchedules()
    }
  }

  return {
    // search
    searchQuery: folderNav.searchQuery,
    setSearchQuery: folderNav.setSearchQuery,

    // folder nav
    selectedFolder: folderNav.selectedFolder,
    openFolder: (item) => openFolder(item, handleFolderClearState),
    closeFolder: () => closeFolder(handleFolderClearState),

    // recently viewed
    recentlyViewed: folderNav.recentlyViewed,

    // ISO standards
    standards: iso.standards,
    loadingStandards: iso.loadingStandards,

    // ISO clauses
    selectedStandard: iso.selectedStandard,
    clauses: iso.clauses,
    loadingClauses: iso.loadingClauses,
    openStandard: (standard) => openStandard(standard, () => setSearchQuery('')),
    closeStandard: () => closeStandard(() => setSearchQuery('')),

    // Task Reports sub-folder nav
    selectedTaskFolder: folderNav.selectedTaskFolder,
    openTaskFolder: (item) => openTaskFolder(item, handleLoadReports),
    closeTaskFolder: () => closeTaskFolder(clearAllReports),

    // NCR closed reports
    ncrReports: taskReports.ncrReports,
    loadingNcr: taskReports.loadingNcr,

    // CAR closed reports
    carReports: taskReports.carReports,
    loadingCar: taskReports.loadingCar,

    // QDDR closed reports
    qddrReports: taskReports.qddrReports,
    loadingQddr: taskReports.loadingQddr,

    // Audit reports
    auditReports: taskReports.auditReports,
    loadingAudit: taskReports.loadingAudit,

    // Audit schedules
    auditSchedules: taskReports.auditSchedules,
    loadingAuditSchedules: taskReports.loadingAuditSchedules,

    // CAR details (clean orchestrator mapping)
    selectedCar: carDetails.selectedCar,
    isCarDetailsModalOpen: carDetails.isCarDetailsModalOpen,
    openCarDetails: carDetails.openCarDetails,
    closeCarDetails: carDetails.closeCarDetails,
    submitCapa: taskReports.submitCapa,
    verifyCar: taskReports.verifyCar,

    carDetailsModalProps: {
      isOpen: carDetails.isCarDetailsModalOpen,
      onClose: carDetails.closeCarDetails,
      car: carDetails.selectedCar,
      onSubmitCapa: taskReports.submitCapa,
      onVerify: taskReports.verifyCar,
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
      handleCapaSubmit: (e) => carDetails.handleCapaSubmit(e, taskReports.submitCapa, null),
      handleVerificationSubmit: (outcome) => carDetails.handleVerificationSubmit(outcome, taskReports.verifyCar, null)
    },

    // Audit Run Details props
    ...auditRunDetails
  }
}