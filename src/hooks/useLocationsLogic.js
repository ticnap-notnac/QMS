import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import {
  loadLocations as loadLocationsController,
  createLocation as createLocationController,
  deleteLocation as deleteLocationController,
} from '@/services/locationService'

export default function useLocationsLogic() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, reload, createItem, deleteItem, error } = useCategoryManager({
    loadFn: loadLocationsController,
    createFn: createLocationController,
    deleteFn: deleteLocationController,
  })

  const filtered = useMemo(() => {
    return items.filter((location) => 
      (location.location_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
  }, [items, searchQuery])

  const openCategoryModal = () => {
    setFormError('')
    setFormMessage('')
    setCategoryInput('')
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
  }

  const handleSubmitCategory = async (event) => {
    event.preventDefault()
    const nextValue = categoryInput.trim()
    if (!nextValue) {
      setFormError('Please enter a name.')
      return
    }
    try {
      setFormError('')
      await createItem(nextValue)
      setFormMessage(`Added location ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteLocation = async (location) => {
    const confirmed = window.confirm(`Delete location "${location.location_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(location.id)
      setFormMessage(`Deleted location ${location.location_name} successfully.`)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const listPanelProps = {
    title: 'Available Locations',
    items: filtered,
    loading,
    labelKey: 'location_name',
    onDelete: handleDeleteLocation,
    deletingId,
    noMatchesText: 'No matches found.'
  }

  const categoryModalProps = {
    isOpen: isCategoryModalOpen,
    onClose: closeCategoryModal,
    onSubmit: handleSubmitCategory,
    title: 'Create New Location',
    label: 'Location Name',
    value: categoryInput,
    onChange: (event) => setCategoryInput(event.target.value),
    placeholder: 'Enter location name',
    loading: false,
    error: formError,
    message: formMessage,
    submitLabel: 'Create Location',
    helperText: 'Create a location entry that will be available in the NCR report modal.'
  }

  return {
    searchQuery,
    setSearchQuery,
    reload,
    openCategoryModal,
    error,
    listPanelProps,
    categoryModalProps
  }
}
