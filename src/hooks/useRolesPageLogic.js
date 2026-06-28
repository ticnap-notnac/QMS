import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'

export default function useRolesPageLogic({ loadFn, createFn, deleteFn } = {}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const [pageMessage, setPageMessage] = useState('')
  const [pageError, setPageError] = useState('')
  const [roleToDelete, setRoleToDelete] = useState(null)

  const { items, loading, deletingId, creating, reload, createItem, deleteItem, error: categoryError } = useCategoryManager({
    loadFn,
    createFn,
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
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
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
      await createItem(nextValue)
      await reloadLookups()
      setPageMessage(`Added role "${nextValue}" successfully.`)
      setPageError('')
    } catch (err) {
      setFormError('This role could not be added. Please try again.')
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
      setPageMessage(`Deleted role "${roleToDelete.role_name}" successfully.`)
    } catch (err) {
      setPageError('This role could not be deleted. It may be assigned to users.')
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
    onConfirm: confirmDeleteRole,
    onCancel: cancelDeleteRole,
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
    pageMessage,
    setPageMessage,
    pageError,
    setPageError,
    handleSubmitCategory,
    handleDeleteRole,
    categoryError,
    confirmDialogProps,
  }
}
