import { useState, useEffect, useCallback } from 'react'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import RolePermissionsMatrix from '@/components/Admin/RolePermissionsMatrix'
import Toast from '@/components/UI/Toast.jsx'
import { loadRoles } from '@/services/roleService'
import './AdminPanel.css'

export default function PermissionsPage({ userRole }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadRoles()
      setRoles(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load roles for permissions:', err)
      setError(err.message || 'Failed to load roles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  return (
    <div className="page-root">
      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Manage Role Permissions</h1>

          <SettingsNavbar userRole={userRole} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="Permissions" />
                  </div>
                </div>
              </div>

              <div className="glass-card-content" style={{ paddingTop: '10px' }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Loading role permissions...
                  </div>
                ) : (
                  <RolePermissionsMatrix roles={roles} onPermissionsUpdated={fetchRoles} />
                )}
              </div>
            </div>
          </div>

          {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
        </main>
      ) : (
        <main className="page-main-centered">
          <h1 className="page-title">Access Denied</h1>
          <div className="access-denied-text">You don't have permission to access this page.</div>
        </main>
      )}
    </div>
  )
}
