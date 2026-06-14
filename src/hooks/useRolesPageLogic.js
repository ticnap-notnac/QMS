import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'

export default function useRolesPageLogic({ loadFn, createFn, deleteFn } = {}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, creating, reload, createItem, deleteItem, error } = useCategoryManager({
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
      setFormMessage(`Added role ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteRole = async (role) => {
    const confirmed = window.confirm(`Delete role "${role.role_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(role.id)
      await reloadLookups()
      setFormMessage(`Deleted role ${role.role_name} successfully.`)
    } catch (err) {
      setFormError(err.message)
    }
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
    handleSubmitCategory,
    handleDeleteRole,
    error,
  }
}
