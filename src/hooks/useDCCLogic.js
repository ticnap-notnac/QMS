import { useEffect } from 'react'
import { useDCCFolderNav } from './useDCC/useDCCFolderNav'
import { useDCCISO } from './useDCC/useDCCISO'
import { useDCCTaskReports } from './useDCC/useDCCTaskReports'

export function useDCCLogic() {
  // 1. Folder Navigation & Search Query state
  const folderNav = useDCCFolderNav()
  const { selectedFolder, openFolder, closeFolder, openTaskFolder, closeTaskFolder, setSearchQuery } = folderNav

  // 2. ISO Standards & Clauses checklist logic
  const iso = useDCCISO()
  const { loadActiveStandards, openStandard, closeStandard, setSelectedStandard, setClauses } = iso

  // 3. Completed Task Reports logic
  const taskReports = useDCCTaskReports()
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

    // CAR details
    selectedCar: taskReports.selectedCar,
    isCarDetailsModalOpen: taskReports.isCarDetailsModalOpen,
    openCarDetails: taskReports.openCarDetails,
    closeCarDetails: taskReports.closeCarDetails,
    submitCapa: taskReports.submitCapa,
    verifyCar: taskReports.verifyCar,
  }
}