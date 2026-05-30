import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import AddUserModal from '@/components/AddUserModal'
import { createUser } from '@/services/userService'
import { useLookup } from '@/context/LookupContext'
import './PagesStyles.css'
import SearchForm from '@/components/SearchForm'
import AdminNavbar from '@/components/AdminNavbar'
import useUserManager from '@/hooks/useUserManager'
import { insertLog, logAction } from '@/services/logService'
import { formatDisplayName } from '@/utils/userUtils'
import { supabase } from '@/utils/supabase'

export default function AddUserPage({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  onToggleNotifications,
  isNotificationsOpen,
  userRole,
  userName,
  userPosition,
  setProfileTargetTab,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const { roles, departments, loading: lookupsLoading, reloadLookups } = useLookup()
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    userName: '',
    contactNumber: '',
    roleId: '',
    departmentId: '',
  })

  // roles/departments are supplied by LookupContext
  const { items: adminUsers, loading: usersLoading, error: usersError, deletingId: deletingUserId, reload: reloadUsers, createItem: createUserItem, deleteItem } = useUserManager({ createFn: createUser })

  useEffect(() => {
    // initial load of users after roles/departments
    reloadUsers()
  }, [reloadUsers])

  const handleUserFieldChange = (event) => {
    const { name, value } = event.target
    setNewUser((current) => ({ ...current, [name]: value }))
  }

  const openAddUserModal = () => {
    setFormError('')
    setFormMessage('')
    // ensure default selections come from lookups
    setNewUser((current) => ({
      ...current,
      roleId: current.roleId || roles[0]?.id?.toString() || '',
      departmentId: current.departmentId || departments[0]?.id?.toString() || '',
    }))
    setIsAddUserModalOpen(true)
  }

  const closeAddUserModal = () => {
    if (!submitting) setIsAddUserModalOpen(false)
  }

  const handleSubmitNewUser = async (event) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setFormError('')
      setFormMessage('')

      const result = await createUserItem({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        userName: newUser.userName,
        contactNumber: newUser.contactNumber,
        roleId: newUser.roleId || null,
        departmentId: newUser.departmentId || null,
      })

      setFormMessage(`Created ${result.authUser.email} successfully.`)
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        userName: '',
        contactNumber: '',
        roleId: roles[0]?.id?.toString() || '',
        departmentId: departments[0]?.id?.toString() || '',
      })
      await reloadUsers()
      setIsAddUserModalOpen(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (user) => {
    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.user_name || user.email
    const confirmed = window.confirm(
      `This will delete ${displayName} from the users table.\n\nThis does not remove the Supabase auth account unless you also delete it from Auth separately. Continue?`
    )

    if (!confirmed) return

    try {
      setFormError('')
      await deleteItem(user.id)
      try {
        await logAction({ source: 'users', action: 'user_delete', details: { id: user.id, deleted_auth_id: user.auth_id || null, deleted_display: displayName } })
      } catch (e) {
        console.warn('Failed to record user_delete from UI:', e?.message || e)
      }
      setFormMessage(`Deleted ${displayName} successfully.`)
    } catch (err) {
      console.error('Delete user error:', err)
      setFormError(err.message)
      setFormError(`Failed to delete user: ${err.message}`)
    } finally {
      // deletingId is tracked by hook
    }
  }

  const roleNameById = new Map((roles || []).map((role) => [String(role.id), role.role_name]))
  const departmentNameById = new Map((departments || []).map((department) => [String(department.id), department.department_name]))

  const filteredUsers = adminUsers.filter((user) => {
    const search = searchQuery.trim().toLowerCase()
    if (!search) return true
    const roleName = roleNameById.get(String(user.role_id)) || ''
    const departmentName = departmentNameById.get(String(user.department_id)) || ''
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    const haystack = [
      fullName,
      user.user_name,
      user.email,
      user.contact_number,
      user.employee_no,
      roleName,
      departmentName,
    ].join(' ').toLowerCase()
    return haystack.includes(search)
  })

  return (
    <div className="page-root">
      <Navbar
        activePage={activePage}
        onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={onToggleMenu}
        onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={onToggleNotifications}
        userRole={userRole}
        userName={userName}
        userPosition={userPosition}
        setProfileTargetTab={setProfileTargetTab}
      />

      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Admin — Add User</h1>

          <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar
                      activeTab={activePage === 'Roles' ? 'Roles' : activePage === 'Departments' ? 'Dept' : activePage === 'ISO' ? 'ISO Module' : 'Users'}
                      onTabChange={(tab) => {
                        const map = {
                          Users: 'Admin Panel',
                          Dept: 'Departments',
                          Roles: 'Roles',
                          'ISO Module': 'ISO'
                        }
                        const target = map[tab] || 'Admin Panel'
                        onPageChange?.(target)
                      }}
                    />
                  </div>
                </div>

                <div className="admin-search-actions-row">
                  <div className="admin-search-container">
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reloadUsers} placeholder="Search..." />
                  </div>

                  <div className="admin-actions-right">
                    <button onClick={openAddUserModal} className="btn-add-action"><span>+ Add User</span></button>
                  </div>
                </div>

              </div>

              <div className="glass-card-content">
                <div className="admin-users-section">
                  <div className="admin-users-header">
                    <div>
                      <h3 className="glass-card-heading">Manage Users</h3>
                      <p className="glass-card-subtext">View all user accounts created in Supabase.</p>
                    </div>
                    <div className="admin-users-count">{filteredUsers.length} users</div>
                  </div>

                  {usersError ? <div className="user-info-error">{usersError}</div> : null}

                  {usersLoading ? (
                    <p className="glass-card-subtext">Loading users...</p>
                  ) : filteredUsers.length === 0 ? (
                    <div className="admin-users-empty">
                      <p>No users found.</p>
                      <span>Try clearing the search box or adding a user.</span>
                    </div>
                  ) : (
                    <div className="admin-users-table-wrap">
                      <table className="admin-users-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Contact</th>
                            <th>Employee No.</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user) => {
                            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'
                            const roleName = roleNameById.get(String(user.role_id)) || '-'
                            const departmentLabel = departmentNameById.get(String(user.department_id)) || '-'
                            const isDeleting = deletingUserId === user.id

                            return (
                              <tr key={user.id || user.auth_id || user.email}>
                                <td>{fullName}</td>
                                <td>{user.user_name || '-'}</td>
                                <td>{user.email || '-'}</td>
                                <td>{roleName}</td>
                                <td>{departmentLabel}</td>
                                <td>{user.contact_number || '-'}</td>
                                <td>{user.employee_no || '-'}</td>
                                <td>
                                  <button type="button" className="btn-delete-user" onClick={() => handleDeleteUser(user)} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <AddUserModal
            isOpen={isAddUserModalOpen}
            onClose={closeAddUserModal}
            onSubmit={handleSubmitNewUser}
            onChange={handleUserFieldChange}
            formData={newUser}
            availableRoles={roles}
            rolesLoading={lookupsLoading}
            availableDepartments={departments}
            departmentsLoading={lookupsLoading}
            loading={submitting}
            error={formError}
            message={formMessage}
          />
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
