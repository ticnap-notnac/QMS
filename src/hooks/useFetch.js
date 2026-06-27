import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export function useFetch(table, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      let query = supabase.from(table).select(options.select || '*')

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error
      setData(data)
      setError(null)
    } catch (err) {
      setError('We could not load the requested data. Please try again or refresh the page.')
      console.error(`Error fetching from ${table}:`, err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [table])

  return { data, loading, error, refetch: fetchData }
}
