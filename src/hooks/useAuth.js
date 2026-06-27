import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { translateAuthError } from '@/utils/authErrors'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(data?.user || null)
      } catch (err) {
        setError(translateAuthError(err, 'Could not verify your session. Please try refreshing.'))
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    } catch (err) {
      setError(translateAuthError(err))
      throw err
    }
  }

  const logout = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (err) {
      setError(translateAuthError(err, 'Sign-out failed. Please refresh the page and try again.'))
      throw err
    }
  }

  return { user, loading, error, login, logout }
}
