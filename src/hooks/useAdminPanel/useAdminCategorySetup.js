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
  const [pageMessage, setPageMessage] = useState('')
  const [pageError, setPageError] = useState('')

  const { items, loading, deletingId, creating, reload, createItem, deleteItem, error } = useCategoryManager({
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
      setPageMessage(`Added ${entityName.toLowerCase()} "${nextValue}" successfully.`)
      setPageError('')
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteCategory = async (item) => {
    const confirmed = window.confirm(`Delete ${entityName.toLowerCase()} "${item[labelKey]}"?`)
    if (!confirmed) return
    try {
      setPageError('')
      await deleteItem(item.id)
      await reloadLookups()
      setPageMessage(`Deleted ${entityName.toLowerCase()} "${item[labelKey]}" successfully.`)
    } catch (err) {
      setPageError(err.message)
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
    loading: creating,
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
    pageMessage,
    pageError,
    listPanelProps,
    categoryModalProps
  }
}
