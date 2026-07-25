import { useState, useEffect } from 'react'
import { Shield, Check, RefreshCw, Save, Lock, Layout, CheckSquare } from 'lucide-react'
import { updateRolePermissions } from '@/services/roleService'
import Toast from '@/components/UI/Toast.jsx'
import '@/pages/AdminPanel.css'

const AVAILABLE_PAGES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Overview metrics and recent activity' },
  { key: 'reports', label: 'Reports', description: 'NCR, CAR, and QDDR quality reports' },
  { key: 'iso', label: 'ISO Standards', description: 'ISO clauses, compliance matrix & standards' },
  { key: 'dcc', label: 'DCC (Document Control)', description: 'Document control center and logs' },
  { key: 'audit_tools', label: 'Audit Tools', description: 'Audit schedules, checklists & audit runs' },
  { key: 'admin_panel', label: 'Admin Panel & Settings', description: 'System administration, roles, departments, locations' },
]

const AVAILABLE_RIGHTS = [
  { key: 'accept_decline_report', label: 'Accept / Decline Reports', description: 'Approve, accept, or decline submitted quality reports' },
  { key: 'assign_report', label: 'Assign Reports', description: 'Assign reports to investigators or reviewers' },
  { key: 'create_report', label: 'Create Reports', description: 'Create new NCR, CAR, or QDDR reports' },
  { key: 'edit_delete_report', label: 'Edit / Delete Reports', description: 'Modify or remove existing quality reports' },
  { key: 'submit_capa', label: 'Submit CAPA Actions', description: 'Submit corrective and preventive actions for CARs' },
  { key: 'verify_car', label: 'Verify CAR Actions', description: 'Perform verification on completed CAR actions' },
  { key: 'manage_iso', label: 'Manage ISO Standards', description: 'Add, update, or remove ISO standards and clauses' },
  { key: 'manage_users', label: 'Manage Users & Config', description: 'Add, edit, or remove user accounts and system configuration' },
  { key: 'manage_audit_schedules', label: 'Manage Audit Schedules', description: 'Create, schedule, and assign audit runs' },
]

const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    pages: ['dashboard', 'reports', 'iso', 'dcc', 'audit_tools', 'admin_panel', 'settings'],
    rights: ['accept_decline_report', 'assign_report', 'create_report', 'edit_delete_report', 'submit_capa', 'verify_car', 'manage_iso', 'manage_users', 'manage_audit_schedules'],
  },
  auditor: {
    pages: ['dashboard', 'reports', 'iso', 'dcc', 'audit_tools', 'settings'],
    rights: ['accept_decline_report', 'assign_report', 'create_report', 'submit_capa', 'manage_iso', 'manage_audit_schedules'],
  },
  'team leader': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: ['create_report', 'accept_decline_report'],
  },
  'warehouse supervisor': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: ['create_report', 'accept_decline_report', 'assign_report'],
  },
  'warehouse executive': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: ['create_report', 'accept_decline_report'],
  },
  'checker': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: ['create_report', 'verify_car'],
  },
  'warehouse checker': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: ['create_report', 'verify_car'],
  },
  default: {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: ['create_report'],
  }
}

export default function RolePermissionsMatrix({ roles = [], onPermissionsUpdated }) {
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [permissions, setPermissions] = useState({ pages: [], rights: [] })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(String(roles[0].id))
    }
  }, [roles, selectedRoleId])

  const selectedRole = roles.find(r => String(r.id) === String(selectedRoleId))

  useEffect(() => {
    if (!selectedRole) return
    const rawPerms = selectedRole.permissions
    let parsedPages = []
    let parsedRights = []

    if (rawPerms && typeof rawPerms === 'object') {
      parsedPages = Array.isArray(rawPerms.pages) ? [...rawPerms.pages] : []
      parsedRights = Array.isArray(rawPerms.rights) ? [...rawPerms.rights] : []
    } else {
      const roleKey = String(selectedRole.role_name || '').toLowerCase()
      const fallback = DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS.default
      parsedPages = [...fallback.pages]
      parsedRights = [...fallback.rights]
    }

    setPermissions({ pages: parsedPages, rights: parsedRights })
  }, [selectedRole])

  const togglePage = (pageKey) => {
    setPermissions(prev => {
      const exists = prev.pages.includes(pageKey)
      const newPages = exists ? prev.pages.filter(p => p !== pageKey) : [...prev.pages, pageKey]
      return { ...prev, pages: newPages }
    })
  }

  const toggleRight = (rightKey) => {
    setPermissions(prev => {
      const exists = prev.rights.includes(rightKey)
      const newRights = exists ? prev.rights.filter(r => r !== rightKey) : [...prev.rights, rightKey]
      return { ...prev, rights: newRights }
    })
  }

  const handleSelectAll = () => {
    setPermissions({
      pages: AVAILABLE_PAGES.map(p => p.key),
      rights: AVAILABLE_RIGHTS.map(r => r.key),
    })
  }

  const handleDeselectAll = () => {
    setPermissions({ pages: ['dashboard'], rights: [] })
  }

  const handleResetDefault = () => {
    if (!selectedRole) return
    const roleKey = String(selectedRole.role_name || '').toLowerCase()
    const fallback = DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS.default
    setPermissions({ pages: [...fallback.pages], rights: [...fallback.rights] })
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      await updateRolePermissions(selectedRole.id, permissions)
      setToast({ message: `Permissions for "${selectedRole.role_name}" updated successfully!`, type: 'success' })
      if (onPermissionsUpdated) {
        onPermissionsUpdated()
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to save permissions.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="permissions-matrix-container" style={{ marginTop: '24px' }}>
      <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} color="#2563eb" /> Role Access & Permission Rights
          </h2>
          <p className="glass-card-subtext" style={{ margin: '4px 0 0 0' }}>
            Select a role to configure which pages and action rights users with that role can access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Select Role:</label>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="form-input-reports"
            style={{ minWidth: '180px', fontWeight: '600' }}
          >
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.role_name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedRole && (
        <div style={{ marginTop: '20px' }}>
          {/* Quick Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', padding: '12px 16px', background: 'rgba(241, 245, 249, 0.7)', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
              Configuring permissions for: <span style={{ color: '#2563eb', fontWeight: '700' }}>{selectedRole.role_name}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleSelectAll} className="btn-secondary-light" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                Select All
              </button>
              <button type="button" onClick={handleDeselectAll} className="btn-secondary-light" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                Clear All
              </button>
              <button type="button" onClick={handleResetDefault} className="btn-secondary-light" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={12} /> Reset Default
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Section 1: Page Access */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layout size={18} color="#0284c7" /> Page Access
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {AVAILABLE_PAGES.map(page => {
                  const isChecked = permissions.pages.includes(page.key)
                  return (
                    <label
                      key={page.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${isChecked ? '#93c5fd' : '#f1f5f9'}`,
                        background: isChecked ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePage(page.key)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1e293b' }}>{page.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{page.description}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Section 2: Rights & Actions */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={18} color="#16a34a" /> Action Rights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {AVAILABLE_RIGHTS.map(right => {
                  const isChecked = permissions.rights.includes(right.key)
                  return (
                    <label
                      key={right.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${isChecked ? '#86efac' : '#f1f5f9'}`,
                        background: isChecked ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRight(right.key)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1e293b' }}>{right.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{right.description}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Save Action Footer */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-add-action"
              style={{ padding: '10px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Role Permissions'}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
