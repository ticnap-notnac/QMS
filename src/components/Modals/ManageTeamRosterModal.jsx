import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { CheckSquare, Square, Search } from 'lucide-react'

export default function ManageTeamRosterModal({
  isOpen,
  onClose,
  teamLeaders = [],
  allUsers = [],
  selectedTeamLeaderId,
  onSelectTeamLeader,
  selectedMemberIds = [],
  onToggleMember,
  onSetSelectedMembers,
  onSubmit,
  saving = false,
  error = '',
  departmentNameById,
  roleNameById,
}) {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')

  const selectedTl = useMemo(
    () => (teamLeaders || []).find((tl) => String(tl.id) === String(selectedTeamLeaderId)) || null,
    [teamLeaders, selectedTeamLeaderId]
  )

  // Candidate employees (non-Admin, non-Team-Leader or other regular employees)
  const candidateEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (allUsers || [])
      .filter((u) => {
        if (String(u.id) === String(selectedTeamLeaderId)) return false
        const rName = String(u.role_name || roleNameById?.get(String(u.role_id)) || '').trim().toLowerCase()
        if (['admin', 'super admin', 'super_admin', 'superadmin', 'system administrator', 'administrator', 'team leader'].includes(rName)) {
          return false
        }
        if (deptFilter !== 'ALL' && String(u.department_id) !== String(deptFilter)) {
          return false
        }
        if (q) {
          const full = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
          const uname = (u.user_name || '').toLowerCase()
          const email = (u.email || '').toLowerCase()
          return full.includes(q) || uname.includes(q) || email.includes(q)
        }
        return true
      })
  }, [allUsers, selectedTeamLeaderId, roleNameById, deptFilter, search])

  const uniqueDepts = useMemo(() => {
    const map = new Map()
    for (const u of allUsers || []) {
      if (u.department_id) {
        const name = u.department_name || departmentNameById?.get(String(u.department_id)) || `Dept #${u.department_id}`
        map.set(String(u.department_id), name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allUsers, departmentNameById])

  if (!isOpen) return null

  const selectedSet = new Set((selectedMemberIds || []).map((id) => String(id)))

  const handleSelectAllVisible = () => {
    const next = new Set(selectedSet)
    candidateEmployees.forEach((u) => next.add(String(u.id)))
    onSetSelectedMembers(Array.from(next))
  }

  const handleClearVisible = () => {
    const next = new Set(selectedSet)
    candidateEmployees.forEach((u) => next.delete(String(u.id)))
    onSetSelectedMembers(Array.from(next))
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '95vw',
          maxHeight: 'min(90vh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '24px 28px 20px 28px',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className="modal-header" style={{ marginBottom: '8px', flexShrink: 0 }}>
          <h2 className="modal-title">
            Manage Team Leader Roster
          </h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form
          className="modal-form"
          onSubmit={onSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            paddingBottom: 0,
          }}
        >
          <p className="glass-card-subtext" style={{ marginBottom: '10px', fontSize: '13.5px', lineHeight: '1.4', flexShrink: 0 }}>
            Select a Team Leader and check the employees assigned under them. The Team Leader will be able to manage these employees&apos; active/inactive status and assign NCR reports to them.
          </p>

          {error && <div className="user-info-error" style={{ marginBottom: '10px', flexShrink: 0 }}>{error}</div>}

          <label className="panel-column" style={{ marginBottom: '10px', flexShrink: 0 }}>
            <span className="small-label" style={{ marginBottom: '4px' }}>Select Team Leader: <span style={{ color: '#ef4444' }}>*</span></span>
            <select
              value={selectedTeamLeaderId || ''}
              onChange={(e) => onSelectTeamLeader(e.target.value)}
              className="form-input-reports"
              required
            >
              <option value="">-- Choose a Team Leader --</option>
              {(teamLeaders || []).map((tl) => {
                const name = `${tl.first_name || ''} ${tl.last_name || ''}`.trim() || tl.user_name || tl.email
                const dept = tl.department_name || departmentNameById?.get(String(tl.department_id)) || 'No Dept'
                return (
                  <option key={tl.id} value={tl.id}>
                    {name} ({dept})
                  </option>
                )
              })}
            </select>
          </label>

          {selectedTeamLeaderId ? (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search employee name, username, or email..."
                    className="form-input-reports"
                    style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                  />
                </div>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="form-input-reports"
                  style={{ width: 'auto', minWidth: '150px', fontSize: '13px' }}
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
                >
                  Select Visible
                </button>
                <button
                  type="button"
                  onClick={handleClearVisible}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
                >
                  Unselect Visible
                </button>
              </div>

              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: '140px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#ffffff',
                }}
              >
                {candidateEmployees.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
                    No matching employees found.
                  </div>
                ) : (
                  candidateEmployees.map((emp) => {
                    const isChecked = selectedSet.has(String(emp.id))
                    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.user_name || emp.email
                    const roleLabel = emp.role_name || roleNameById?.get(String(emp.role_id)) || 'Employee'
                    const deptLabel = emp.department_name || departmentNameById?.get(String(emp.department_id)) || '—'
                    const otherTlName =
                      emp.team_leader_id && String(emp.team_leader_id) !== String(selectedTeamLeaderId)
                        ? emp.team_leader_name || 'Another TL'
                        : null

                    return (
                      <div
                        key={emp.id}
                        onClick={() => onToggleMember(String(emp.id))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isChecked ? '#f0fdf4' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {isChecked ? (
                            <CheckSquare size={18} color="#16a34a" />
                          ) : (
                            <Square size={18} color="#94a3b8" />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a' }}>
                              {fullName}{' '}
                              <span style={{ fontWeight: 400, color: '#64748b', fontSize: '12px' }}>
                                (@{emp.user_name})
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {roleLabel} • {deptLabel}
                              {otherTlName ? (
                                <span style={{ marginLeft: '8px', color: '#d97706', fontWeight: 500 }}>
                                  (Currently under {otherTlName})
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`status-badge ${
                            emp.status === 'ACTIVE'
                              ? 'status-active'
                              : emp.status === 'DEACTIVATED'
                                ? 'status-deactivated'
                                : 'status-inactive'
                          }`}
                        >
                          {emp.status ?? 'ACTIVE'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>
                {selectedMemberIds.length} employee{selectedMemberIds.length === 1 ? '' : 's'} assigned to{' '}
                {selectedTl ? `${selectedTl.first_name || ''} ${selectedTl.last_name || ''}`.trim() || selectedTl.user_name : 'this Team Leader'}.
              </div>
            </>
          ) : null}

          <div
            className="modal-submit-row"
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary-light"
              style={{ minWidth: '110px' }}
            >
              Cancel
            </button>
            <button
              className="btn-gradient-primary"
              type="submit"
              disabled={saving || !selectedTeamLeaderId}
              style={{ minWidth: '160px' }}
            >
              {saving ? 'Saving Roster...' : 'Save Team Roster'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
