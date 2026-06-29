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
  const [toast, setToast] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [editingItem, setEditingItem] = useState(null)

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
    setEditingItem(null)
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
    setEditingItem(null)
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
      if (editingItem) {
        const originalValue = editingItem[labelKey] || ''
        if (nextValue === originalValue) {
          closeCategoryModal()
          return
        }
        await createItem(nextValue)
        await deleteItem(editingItem.id)
        await reloadLookups()
        setToast({ message: `Updated ${entityName.toLowerCase()} successfully from "${originalValue}" to "${nextValue}".`, type: 'success' })
      } else {
        await createItem(nextValue)
        await reloadLookups()
        setToast({ message: `Added ${entityName.toLowerCase()} "${nextValue}" successfully.`, type: 'success' })
      }
      closeCategoryModal()
    } catch (err) {
      setFormError(editingItem ? `Could not update ${entityName.toLowerCase()}. Please try again.` : 'This item could not be added. Please try again.')
    }
  }

  const handleDeleteCategory = (item) => {
    setItemToDelete(item)
  }

  const confirmDeleteCategory = async () => {
    if (!itemToDelete) return
    try {
      setToast(null)
      await deleteItem(itemToDelete.id)
      await reloadLookups()
      setToast({ message: `Deleted ${entityName.toLowerCase()} "${itemToDelete[labelKey]}" successfully.`, type: 'success' })
    } catch (err) {
      setToast({ message: err?.message || 'This item could not be deleted. It may be in use elsewhere in the system.', type: 'error' })
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
    onEdit: (item) => {
      setFormError('')
      setFormMessage('')
      setCategoryInput(item[labelKey] || '')
      setEditingItem(item)
      setIsCategoryModalOpen(true)
    },
    onDelete: handleDeleteCategory,
    deletingId,
    noMatchesText: 'No matches found.'
  }

  const categoryModalProps = {
    isOpen: isCategoryModalOpen,
    onClose: closeCategoryModal,
    onSubmit: handleSubmitCategory,
    title: editingItem ? `Edit ${entityName}` : `Create New ${entityName}`,
    label: `${entityName} Name`,
    value: categoryInput,
    onChange: (event) => setCategoryInput(event.target.value),
    placeholder: placeholderText,
    loading: creating || loading,
    error: formError,
    message: formMessage,
    submitLabel: editingItem ? 'Save Changes' : `Create ${entityName}`,
    helperText: editingItem ? `Modify the name of the selected ${entityName.toLowerCase()} entry.` : helperTextText
  }

  const confirmDialogProps = {
    isOpen: !!itemToDelete,
    title: `Delete ${entityName}`,
    message: itemToDelete ? `Are you sure you want to delete ${entityName.toLowerCase()} "${itemToDelete[labelKey]}"?` : '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    isLoading: !!deletingId,
    onConfirm: confirmDeleteCategory,
    onCancel: cancelDeleteCategory,
  }

  return {
    searchQuery,
    setSearchQuery,
    reload,
    openCategoryModal,
    error,
    toast,
    setToast,
    listPanelProps,
    categoryModalProps,
    confirmDialogProps
  }
}
