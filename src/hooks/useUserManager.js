import { useCallback, useEffect, useState } from 'react'
import { request } from '@/lib/api'
import { supabase } from '@/utils/supabase'

export default function useUserManager({ createFn } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await request('/users')
      setItems(data || [])
    } catch (err) {
      setItems([])
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const createItem = useCallback(async (userData) => {
    setError('')
    if (!createFn) throw new Error('createFn is required')
    const result = await createFn(userData)
    await reload()
    return result
  }, [createFn, reload])

  const deleteItem = useCallback(async (id) => {
    setDeletingId(id)
    setError('')
    try {
      let userAuthId = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userAuthId = user?.id || null
      } catch (e) {
        // ignore
      }

      await request(`/users/${id}`, { method: 'DELETE', body: JSON.stringify({ userAuthId }) })
      await reload()
    } catch (err) {
      setError(err?.message || String(err))
      throw err
    } finally {
      setDeletingId(null)
    }
  }, [reload])

  return { items, loading, error, deletingId, reload, createItem, deleteItem }
}
