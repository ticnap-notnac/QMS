import { useEffect, useState, useCallback } from 'react'

export default function useCategoryManager({ loadFn, createFn, deleteFn }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadFn()
      setItems(data || [])
    } catch (err) {
      setItems([])
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [loadFn])

  useEffect(() => {
    reload()
  }, [reload])

  const createItem = useCallback(async (name) => {
    setError('')
    try {
      await createFn(name)
      await reload()
    } catch (err) {
      setError(err?.message || String(err))
      throw err
    }
  }, [createFn, reload])

  const deleteItem = useCallback(async (id) => {
    setDeletingId(id)
    setError('')
    try {
      await deleteFn(id)
      await reload()
    } catch (err) {
      setError(err?.message || String(err))
      throw err
    } finally {
      setDeletingId(null)
    }
  }, [deleteFn, reload])

  return {
    items,
    loading,
    error,
    deletingId,
    reload,
    createItem,
    deleteItem,
  }
}
