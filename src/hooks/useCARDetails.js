import { useState } from 'react'

export function useCARDetails() {
  const [selectedCar, setSelectedCar] = useState(null)
  const [isCarDetailsModalOpen, setIsCarDetailsModalOpen] = useState(false)

  const openCarDetails = (car) => {
    setSelectedCar(car)
    setIsCarDetailsModalOpen(true)
  }

  const closeCarDetails = () => {
    setSelectedCar(null)
    setIsCarDetailsModalOpen(false)
  }

  return {
    selectedCar,
    isCarDetailsModalOpen,
    openCarDetails,
    closeCarDetails,
    onSelectCar: openCarDetails
  }
}
