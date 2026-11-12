import { useState } from 'react'

export function useReportsModals() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isCARModalOpen, setIsCARModalOpen] = useState(false)
  const [isQDDRModalOpen, setIsQDDRModalOpen] = useState(false)

  const [selectedCARReport, setSelectedCARReport] = useState(null)
  const [selectedQDDRReport, setSelectedQDDRReport] = useState(null)

  const openCARModal = (report = null) => {
    setSelectedCARReport(report)
    setIsCARModalOpen(true)
  }
  const closeCARModal = () => {
    setIsCARModalOpen(false)
    setSelectedCARReport(null)
  }

  const openQDDRModal = (report = null) => {
    setSelectedQDDRReport(report)
    setIsQDDRModalOpen(true)
  }
  const closeQDDRModal = () => {
    setIsQDDRModalOpen(false)
    setSelectedQDDRReport(null)
  }

  return {
    isFilterModalOpen,
    setIsFilterModalOpen,
    isCARModalOpen,
    setIsCARModalOpen,
    isQDDRModalOpen,
    setIsQDDRModalOpen,
    selectedCARReport,
    setSelectedCARReport,
    selectedQDDRReport,
    setSelectedQDDRReport,
    openCARModal,
    closeCARModal,
    openQDDRModal,
    closeQDDRModal,
  }
}
