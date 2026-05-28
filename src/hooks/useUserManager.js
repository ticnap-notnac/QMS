import { useCallback, useEffect, useState } from 'react'
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
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, employee_no, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
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
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) throw error
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
