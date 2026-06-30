import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'

export default function useRolesPageLogic({ loadFn, createFn, updateFn, deleteFn } = {}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const [pageError, setPageError] = useState('')
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [toast, setToast] = useState(null)

  const { items, loading, deletingId, creating, reload, createItem, updateItem, deleteItem, error: categoryError } = useCategoryManager({
    loadFn,
    createFn,
    updateFn,
    deleteFn,
  })

  const { reloadLookups } = useLookup()

  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) return items
    return items.filter((r) => (r.role_name || '').toLowerCase().includes(q))
  }, [items, searchQuery])

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
    if (event && event.preventDefault) event.preventDefault()
    const nextValue = (categoryInput || '').trim()
    if (!nextValue) {
      setFormError('Please enter a name.')
      return
    }
    try {
      setFormError('')
      if (editingItem) {
        const originalValue = editingItem.role_name || ''
        if (nextValue === originalValue) {
          closeCategoryModal()
          return
        }
        await updateItem(editingItem.id, nextValue)
        await reloadLookups()
        setToast({ message: `Updated role successfully from "${originalValue}" to "${nextValue}".`, type: 'success' })
        setPageError('')
      } else {
        await createItem(nextValue)
        await reloadLookups()
        setToast({ message: `Added role "${nextValue}" successfully.`, type: 'success' })
        setPageError('')
      }
      closeCategoryModal()
    } catch (err) {
      setFormError(editingItem ? 'Could not update role. Please try again.' : 'This role could not be added. Please try again.')
    }
  }

  const handleDeleteRole = (role) => {
    setRoleToDelete(role)
  }

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return
    try {
      setPageError('')
      await deleteItem(roleToDelete.id)
      await reloadLookups()
      setToast({ message: `Deleted role "${roleToDelete.role_name}" successfully.`, type: 'success' })
    } catch (err) {
      setToast({ message: err?.message || 'This role could not be deleted.', type: 'error' })
    } finally {
      setRoleToDelete(null)
    }
  }

  const cancelDeleteRole = () => setRoleToDelete(null)

  const confirmDialogProps = {
    isOpen: !!roleToDelete,
    title: 'Delete Role',
    message: roleToDelete ? `Are you sure you want to delete role "${roleToDelete.role_name}"?` : '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    isLoading: !!deletingId,
    onConfirm: confirmDeleteRole,
    onCancel: cancelDeleteRole,
  }

  const handleEditRole = (role) => {
    setFormError('')
    setFormMessage('')
    setCategoryInput(role.role_name || '')
    setEditingItem(role)
    setIsCategoryModalOpen(true)
  }

  return {
    items,
    filtered,
    loading,
    deletingId,
    creating,
    reload,
    searchQuery,
    setSearchQuery,
    isCategoryModalOpen,
    openCategoryModal,
    closeCategoryModal,
    categoryInput,
    setCategoryInput,
    formError,
    setFormError,
    formMessage,
    setFormMessage,
    toast,
    setToast,
    pageError,
    setPageError,
    handleSubmitCategory,
    handleDeleteRole,
    handleEditRole,
    categoryError,
    confirmDialogProps,
    editingItem,
  }
}
