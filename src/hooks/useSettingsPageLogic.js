import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { insertLog } from '@/services/logService'

export function useSettingsPageLogic({ authUserId, onProfileUpdate } = {}) {
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    user_name: '',
    email: '',
    contact_number: '',
  })
  const [activeSection, setActiveSection] = useState('Profile & Account')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [authId, setAuthId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })

  useEffect(() => {
    if (activeSection === 'Audit Tools') {
      // enforcement of UI-level guard: callers should ensure userRole check
      setActiveSection('Profile & Account')
    }
  }, [])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const currentAuthId = authUserId || user?.id

        if (currentAuthId) {
          setAuthId(currentAuthId)
          const { data, error } = await supabase
            .from('users')
            .select('first_name, last_name, user_name, email, contact_number')
            .eq('auth_id', currentAuthId)
            .maybeSingle()

          if (error) {
            console.error('Error fetching user profile:', error)
            setToast({ message: 'We could not load your user credentials. Please refresh the page.', type: 'error' })
          } else if (data) {
            setUserProfile({
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              user_name: data.user_name || '',
              email: data.email || user?.email || '',
              contact_number: data.contact_number || '',
            })
          } else {
            setUserProfile(prev => ({ ...prev, email: user?.email || prev.email }))
          }
        }
      } catch (err) {
        setToast({ message: 'We could not load your user profile. Please refresh the page.', type: 'error' })
        console.error('Error fetching user profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [authUserId])

  const handleUpdateChanges = async () => {
    setSaving(true)
    try {
      const { error: profileError } = await supabase
        .from('users')
        .update({
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          user_name: userProfile.user_name,
          contact_number: userProfile.contact_number,
        })
        .eq('auth_id', authId)

      if (profileError) throw new Error('We could not update your profile. Please try again.')

      const updatedFullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      await insertLog({
        level: 'audit',
        source: 'settings',
        userAuthId: authId,
        action: 'profile_update',
        details: {
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          user_name: userProfile.user_name,
          contact_number: userProfile.contact_number,
          display_name: updatedFullName || null,
        },
      })

      if (passwords.current || passwords.new || passwords.confirm) {
        if (!passwords.current) throw new Error('Please enter your current password.')
        if (!passwords.new) throw new Error('Please enter a new password.')
        if (passwords.new !== passwords.confirm) throw new Error('New passwords do not match.')
        if (passwords.new.length < 6) throw new Error('Password must be at least 6 characters.')

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userProfile.email,
          password: passwords.current,
        })
        if (signInError) throw new Error('Current password is incorrect.')

        const { error: passwordError } = await supabase.auth.updateUser({ password: passwords.new })
        if (passwordError) throw new Error('We could not update your password. Please try again.')

        setPasswords({ current: '', new: '', confirm: '' })
      }

      if (onProfileUpdate) await onProfileUpdate()
      setToast({ message: 'Your profile has been updated successfully!', type: 'success' })
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return {
    userProfile,
    setUserProfile,
    activeSection,
    setActiveSection,
    loading,
    toast,
    setToast,
    saving,
    passwords,
    setPasswords,
    handleUpdateChanges,
  }
}

export default useSettingsPageLogic
