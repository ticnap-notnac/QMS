import { useState } from 'react'

export function useReportsModals({ clearEvidenceState, resetCreateForm, setRejectReason, setError }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isPreventiveActionModalOpen, setIsPreventiveActionModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  
  const [detailReport, setDetailReport] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedAssignmentReport, setSelectedAssignmentReport] = useState(null)
  const [rejectTargetReport, setRejectTargetReport] = useState(null)

  const openDetailView = (report) => { setDetailReport(report); setIsDetailOpen(true) }
  const closeDetailView = () => { setIsDetailOpen(false); setDetailReport(null) }

  const openCreateModal = () => { setError(null); resetCreateForm(); setIsModalOpen(true) }
  const closeCreateModal = () => { setIsModalOpen(false); clearEvidenceState() }

  const openUpdateModal = (report) => { setSelectedReport(report); setIsUpdateModalOpen(true) }
  const closeUpdateModal = () => { setIsUpdateModalOpen(false); setSelectedReport(null) }

  const openAssignModal = (report) => { setSelectedAssignmentReport(report); setIsAssignModalOpen(true) }
  const closeAssignModal = () => { setIsAssignModalOpen(false); setSelectedAssignmentReport(null) }

  const openRejectModal = (report) => { setRejectTargetReport(report); setRejectReason(''); setIsRejectModalOpen(true) }
  const closeRejectModal = () => { setIsRejectModalOpen(false); setRejectTargetReport(null); setRejectReason('') }

  return {
    isModalOpen, setIsModalOpen,
    isFilterModalOpen, setIsFilterModalOpen,
    isUpdateModalOpen, setIsUpdateModalOpen,
    isAssignModalOpen, setIsAssignModalOpen,
    isPreventiveActionModalOpen, setIsPreventiveActionModalOpen,
    isRejectModalOpen, setIsRejectModalOpen,
    isDetailOpen, setIsDetailOpen,
    
    detailReport, setDetailReport,
    selectedReport, setSelectedReport,
    selectedAssignmentReport, setSelectedAssignmentReport,
    rejectTargetReport, setRejectTargetReport,

    openDetailView, closeDetailView,
    openCreateModal, closeCreateModal,
    openUpdateModal, closeUpdateModal,
    openAssignModal, closeAssignModal,
    openRejectModal, closeRejectModal,
  }
}
