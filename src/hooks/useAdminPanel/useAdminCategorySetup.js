import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'

export default function useAdminCategorySetup({
  loadFn,
  createFn,
  deleteFn,
  labelKey,
  entityName,
  placeholderText,
  helperTextText
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, reload, createItem, deleteItem, error } = useCategoryManager({
    loadFn,
    createFn,
    deleteFn
  })

  const { reloadLookups } = useLookup()

  const filtered = useMemo(() => {
    return items.filter((d) => 
      (d[labelKey] || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
  }, [items, searchQuery, labelKey])

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
      await reloadLookups()
      setFormMessage(`Added ${entityName.toLowerCase()} "${nextValue}" successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteCategory = async (item) => {
    const confirmed = window.confirm(`Delete ${entityName.toLowerCase()} "${item[labelKey]}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(item.id)
      await reloadLookups()
      setFormMessage(`Deleted ${entityName.toLowerCase()} "${item[labelKey]}" successfully.`)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const listPanelProps = {
    title: `Available ${entityName}s`,
    items: filtered,
    loading,
    labelKey,
    onDelete: handleDeleteCategory,
    deletingId,
    noMatchesText: 'No matches found.'
  }

  const categoryModalProps = {
    isOpen: isCategoryModalOpen,
    onClose: closeCategoryModal,
    onSubmit: handleSubmitCategory,
    title: `Create New ${entityName}`,
    label: `${entityName} Name`,
    value: categoryInput,
    onChange: (event) => setCategoryInput(event.target.value),
    placeholder: placeholderText,
    loading: false,
    error: formError,
    message: formMessage,
    submitLabel: `Create ${entityName}`,
    helperText: helperTextText
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
