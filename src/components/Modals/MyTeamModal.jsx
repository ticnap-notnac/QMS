import { useState, useEffect, useMemo, useCallback } from 'react'
import { Users, Search, RefreshCw } from 'lucide-react'
import { fetchUsers, updateUserStatus } from '@/services/userService'
import { isAdminRole } from '@/utils/roleUtils.js'

export default function MyTeamModal({
  isOpen,
  onClose,
  currentUserId,
  userRole,
}) {
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTlFilter, setSelectedTlFilter] = useState('')

  const isAdmin = isAdminRole(userRole)

  const loadTeamUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchUsers()
      const list = Array.isArray(data) ? data : []
      setAllUsers(list)
    } catch (err) {
      setError(err?.message || 'Could not load team members.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadTeamUsers()
      if (!isAdmin && currentUserId) {
        setSelectedTlFilter(String(currentUserId))
      }
    }
  }, [isOpen, loadTeamUsers, isAdmin, currentUserId])

  const teamLeaders = useMemo(() => {
    return (allUsers || []).filter(
      (u) => String(u.role_name || '').trim().toLowerCase() === 'team leader'
    )
  }, [allUsers])

  const teamMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const targetTlId = isAdmin ? selectedTlFilter : String(currentUserId || '')

    return (allUsers || []).filter((u) => {
      if (targetTlId) {
        if (String(u.team_leader_id || '') !== String(targetTlId)) return false
      } else if (!isAdmin) {
        return false
      } else {
        // Admin viewing "All Assigned Subordinates"
        if (!u.team_leader_id) return false
      }

      if (q) {
        const full = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
        const uname = (u.user_name || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        return full.includes(q) || uname.includes(q) || email.includes(q)
      }
      return true
    })
  }, [allUsers, isAdmin, selectedTlFilter, currentUserId, search])

  const handleToggleMemberStatus = async (member) => {
    const currentStatus = String(member.status || 'ACTIVE').toUpperCase()
    if (!isAdmin && currentStatus === 'DEACTIVATED') return

    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setUpdatingId(member.id)
    setError('')
    try {
      await updateUserStatus(member.id, nextStatus)
      setAllUsers((prev) =>
        prev.map((u) => (String(u.id) === String(member.id) ? { ...u, status: nextStatus } : u))
      )
    } catch (err) {
      setError(err?.message || 'Failed to update employee status.')
    } finally {
      setUpdatingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '95vw' }}
      >
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} /> My Team Roster
          </h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-form">
          <p className="glass-card-subtext" style={{ marginBottom: '12px' }}>
            Manage the availability status of employees under your team. Setting an employee to{' '}
            <strong>INACTIVE</strong> marks them on leave/absent (blocking login and report assignment until set back to{' '}
            <strong>ACTIVE</strong>).
          </p>

          {error && <div className="user-info-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
            {isAdmin && (
              <select
                value={selectedTlFilter}
                onChange={(e) => setSelectedTlFilter(e.target.value)}
                className="form-input-reports"
                style={{ minWidth: '210px', flex: '0 0 auto' }}
              >
                <option value="">All Team Leaders&apos; Teams</option>
                {teamLeaders.map((tl) => {
                  const name = `${tl.first_name || ''} ${tl.last_name || ''}`.trim() || tl.user_name || tl.email
                  return (
                    <option key={tl.id} value={tl.id}>
                      TL: {name}
                    </option>
                  )
                })}
              </select>
            )}

            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team member..."
                className="form-input-reports"
                style={{ paddingLeft: '32px', width: '100%' }}
              />
            </div>

            <button
              type="button"
              onClick={loadTeamUsers}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12.5px',
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#ffffff',
            }}
          >
            {loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
                Loading team roster...
              </div>
            ) : teamMembers.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
                No employees are currently assigned to this team.
              </div>
            ) : (
              teamMembers.map((member) => {
                const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.user_name || member.email
                const status = String(member.status || 'ACTIVE').toUpperCase()
                const isDeactivated = status === 'DEACTIVATED'
                const isUpdating = updatingId === member.id

                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                        {fullName}{' '}
                        <span style={{ fontWeight: 400, color: '#64748b', fontSize: '12px' }}>
                          (@{member.user_name})
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {member.role_name || 'Employee'} • {member.department_name || 'No Dept'}
                        {isAdmin && member.team_leader_name ? ` • TL: ${member.team_leader_name}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        className={`status-badge ${
                          status === 'ACTIVE'
                            ? 'status-active'
                            : status === 'DEACTIVATED'
                              ? 'status-deactivated'
                              : 'status-inactive'
                        }`}
                      >
                        {status}
                      </span>

                      <button
                        type="button"
                        disabled={isUpdating || (!isAdmin && isDeactivated)}
                        onClick={() => handleToggleMemberStatus(member)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: isUpdating || (!isAdmin && isDeactivated) ? 'not-allowed' : 'pointer',
                          border: status === 'ACTIVE' ? '1px solid #fca5a5' : '1px solid #86efac',
                          background: status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4',
                          color: status === 'ACTIVE' ? '#dc2626' : '#15803d',
                          opacity: !isAdmin && isDeactivated ? 0.5 : 1,
                        }}
                      >
                        {isUpdating
                          ? 'Updating...'
                          : !isAdmin && isDeactivated
                            ? 'Deactivated by Admin'
                            : status === 'ACTIVE'
                              ? 'Set Inactive (Leave)'
                              : 'Set Active (Present)'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
