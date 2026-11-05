import { useCallback, useEffect, useMemo, useState } from 'react'
import { assignReportToEmployee } from '@/services/ncrService'
import { fetchUsers } from '@/services/userService'

export default function useAssignReportModal({ report, onSuccess, onClose, currentUserId = null, userRole = '' }) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const userOptions = useMemo(() => {
    return (users || []).map((user) => ({
      id: user.id,
      label: `${user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User'} — ${user.role || user.role_name || 'Unknown'}`,
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
        const isTeamLeader = String(userRole || '').trim().toLowerCase() === 'team leader'
        const activeUsers = (Array.isArray(data) ? data : []).filter((u) => {
          if (String(u.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return false
          if (isTeamLeader && currentUserId) {
            return Number(u.team_leader_id) === Number(currentUserId)
          }
          return true
        })
        setUsers(activeUsers)
      } catch (err) {
        if (active) {
          setError('We could not load the employee list. Please try again.')
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
  }, [report, currentUserId, userRole])

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
      setError(assignError?.message || 'The report could not be assigned. Please try again.')
      return { success: false }
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess, report, selectedUserId, users])

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
    onClose,
  }
}
