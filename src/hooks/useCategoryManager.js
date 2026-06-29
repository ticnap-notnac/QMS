import { useEffect, useState, useCallback } from 'react'

export default function useCategoryManager({ loadFn, createFn, updateFn, deleteFn }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadFn()
      setItems(data || [])
    } catch (err) {
      setItems([])
      setError('We could not load the data. Please refresh the page or try again.')
    } finally {
      setLoading(false)
    }
  }, [loadFn])

  useEffect(() => {
    reload()
  }, [reload])

  const createItem = useCallback(async (name) => {
    setError('')
    setCreating(true)
    try {
      await createFn(name)
      await reload()
    } catch (err) {
      setError('This item could not be created. Please try again.')
      throw err
    } finally {
      setCreating(false)
    }
  }, [createFn, reload])

  const deleteItem = useCallback(async (id) => {
    setDeletingId(id)
    setError('')
    try {
      await deleteFn(id)
      await reload()
    } catch (err) {
      setError('This item could not be deleted. It may be in use elsewhere.')
      throw err
    } finally {
      setDeletingId(null)
    }
  }, [deleteFn, reload])

  const updateItem = useCallback(async (id, name) => {
    setError('')
    try {
      await updateFn(id, name)
      await reload()
    } catch (err) {
      setError('This item could not be updated. Please try again.')
      throw err
    }
  }, [updateFn, reload])

  return {
    items,
    loading,
    error,
    deletingId,
    creating,
    reload,
    createItem,
    updateItem,
    deleteItem,
  }
}
