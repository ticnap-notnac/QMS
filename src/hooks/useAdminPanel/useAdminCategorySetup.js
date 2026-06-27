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
  const [itemToDelete, setItemToDelete] = useState(null)

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
      setFormError('This item could not be added. Please try again.')
    }
  }

  const handleDeleteCategory = (item) => {
    setItemToDelete(item)
  }

  const confirmDeleteCategory = async () => {
    if (!itemToDelete) return
    try {
      setPageError('')
      await deleteItem(itemToDelete.id)
      await reloadLookups()
      setPageMessage(`Deleted ${entityName.toLowerCase()} "${itemToDelete[labelKey]}" successfully.`)
    } catch (err) {
      setPageError('This item could not be deleted. It may be in use elsewhere in the system.')
    } finally {
      setItemToDelete(null)
    }
  }

  const cancelDeleteCategory = () => {
    setItemToDelete(null)
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

  const confirmDialogProps = {
    isOpen: !!itemToDelete,
    title: `Delete ${entityName}`,
    message: itemToDelete ? `Are you sure you want to delete ${entityName.toLowerCase()} "${itemToDelete[labelKey]}"?` : '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    onConfirm: confirmDeleteCategory,
    onCancel: cancelDeleteCategory,
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
    categoryModalProps,
    confirmDialogProps
  }
}
