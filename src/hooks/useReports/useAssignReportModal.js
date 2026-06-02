import { useCallback, useEffect, useMemo, useState } from 'react'
import { assignReportToEmployee } from '@/services/ncrService'
import { fetchUsers } from '@/services/userService'

export default function useAssignReportModal({ report, onSuccess, onClose }) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const userOptions = useMemo(() => {
    return (users || []).map((user) => ({
      id: user.id,
      label: `${user.user_name || 'Unnamed User'} — ${user.role || user.role_name || 'Unknown'}`,
    }))
  }, [users])

  useEffect(() => {
    if (!report) {
      setSelectedUserId('')
      setError(null)
      return
    }

    setSelectedUserId('')
    setError(null)
  }, [report])

  useEffect(() => {
    if (!report) return

    let active = true

    const loadUsers = async () => {
      setLoadingUsers(true)
      setError(null)

      try {
        const data = await fetchUsers()
        if (!active) return
        setUsers(Array.isArray(data) ? data : [])
      } catch (err) {
        if (active) {
          setError(err?.message || 'Failed to load employees.')
        }
      } finally {
        if (active) {
          setLoadingUsers(false)
        }
      }
    }

    loadUsers()

    return () => {
      active = false
    }
  }, [report])

  const handleAssign = useCallback(async () => {
    if (!report?.id) {
      setError('No report selected.')
      return { success: false }
    }

    if (!selectedUserId) {
      setError('Please select an employee.')
      return { success: false }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = { assignedToId: selectedUserId }
      await assignReportToEmployee(report.id, payload)
      const selectedUser = (users || []).find((user) => String(user.id) === String(selectedUserId)) || null
      if (onSuccess) {
        await onSuccess({
          selectedUserId,
          selectedUser,
        })
      }
      return { success: true }
    } catch (assignError) {
      setError(assignError?.message || 'Failed to assign report. Please try again.')
      return { success: false }
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess, report, selectedUserId])

  return {
    selectedUserId,
    setSelectedUserId,
    users,
    userOptions,
    loadingUsers,
    isSubmitting,
    error,
    setError,
    handleAssign,
  }
}
