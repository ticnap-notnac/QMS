import { useState, useCallback } from 'react'

export function useQDDRDetails() {
  const [selectedQddr, setSelectedQddr] = useState(null)
  const [isQddrDetailsModalOpen, setIsQddrDetailsModalOpen] = useState(false)

  const openQddrDetails = useCallback((qddr) => {
    setSelectedQddr(qddr)
    setIsQddrDetailsModalOpen(true)
  }, [])

  const closeQddrDetails = useCallback(() => {
    setSelectedQddr(null)
    setIsQddrDetailsModalOpen(false)
  }, [])

  return {
    selectedQddr,
    setSelectedQddr,
    isQddrDetailsModalOpen,
    openQddrDetails,
    closeQddrDetails,
    onSelectQddr: openQddrDetails
  }
}
