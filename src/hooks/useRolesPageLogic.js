import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'
import { updateRolePositions } from '@/services/roleService'

export default function useRolesPageLogic({ loadFn, createFn, updateFn, deleteFn } = {}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [selectedPositionIds, setSelectedPositionIds] = useState([])
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

  const { positions: availablePositions, reloadLookups } = useLookup()

  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) return items
    return items.filter((r) => (r.role_name || '').toLowerCase().includes(q))
  }, [items, searchQuery])

  const togglePositionSelection = (posId) => {
    const target = String(posId)
    setSelectedPositionIds((prev) =>
      prev.includes(target) ? prev.filter((id) => id !== target) : [...prev, target]
    )
  }

  const openCategoryModal = () => {
    setFormError('')
    setFormMessage('')
    setCategoryInput('')
    setSelectedPositionIds([])
    setEditingItem(null)
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
    setSelectedPositionIds([])
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
      let targetRoleId = null

      if (editingItem) {
        targetRoleId = editingItem.id
        const originalValue = editingItem.role_name || ''
        if (nextValue !== originalValue) {
          await updateItem(editingItem.id, nextValue)
        }
      } else {
        const created = await createItem(nextValue)
        targetRoleId = Array.isArray(created) ? created[0]?.id : created?.id
      }

      if (targetRoleId) {
        await updateRolePositions(targetRoleId, selectedPositionIds)
      }

      closeCategoryModal()
      if (editingItem) {
        setToast({ message: `Updated role "${nextValue}" and positions successfully.`, type: 'success' })
      } else {
        setToast({ message: `Added role "${nextValue}" successfully.`, type: 'success' })
      }
      setPageError('')

      await reloadLookups()
      await reload()
    } catch (err) {
      setFormError(editingItem ? 'Could not update role. Please try again.' : 'This role could not be added. Please try again.')
    }
  }

  const handleDeleteRole = (role) => {
    setRoleToDelete(role)
  }

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return
    const role = roleToDelete
    try {
      setPageError('')
      await deleteItem(role.id)
      setRoleToDelete(null)
      setToast({ message: `Deleted role "${role.role_name}" successfully.`, type: 'success' })
      await reloadLookups()
    } catch (err) {
      setToast({ message: err?.message || 'This role could not be deleted.', type: 'error' })
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
    const existingPosIds = Array.isArray(role.positions) ? role.positions.map((p) => String(p.id)) : []
    setSelectedPositionIds(existingPosIds)
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
    availablePositions,
    selectedPositionIds,
    togglePositionSelection,
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
