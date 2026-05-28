import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import AddUserModal from '@/components/AddUserModal'
import { supabase } from '@/utils/supabase'
import { createAdminUser } from '@/controllers/userController'
import {
  loadRoles as loadRolesController,
  loadDepartments as loadDepartmentsController,
} from '@/controllers/roleController'
import './PagesStyles.css'

// Note: roleController exports loadRoles; department controller exports loadDepartments.
// We use the role controller import above for loadRoles and the departments loader below.
import { loadDepartments } from '@/controllers/departmentController'

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
  const [adminUsers, setAdminUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [availableRoles, setAvailableRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [availableDepartments, setAvailableDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)
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

  const loadRoleAndDepartmentOptions = async () => {
    setRolesLoading(true)
    setDepartmentsLoading(true)

    try {
      const [roles, departments] = await Promise.all([
        loadRolesController(),
        loadDepartments(),
      ])

      setAvailableRoles(roles)
      setAvailableDepartments(departments)
      setNewUser((current) => ({
        ...current,
        roleId: current.roleId || roles[0]?.id?.toString() || '',
        departmentId: current.departmentId || departments[0]?.id?.toString() || '',
      }))

      return { roles, departments }
    } catch (error) {
      console.error('Error loading roles and departments:', error)
      setAvailableRoles([])
      setAvailableDepartments([])
      setFormError(error.message)
      return { roles: [], departments: [] }
    } finally {
      setRolesLoading(false)
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    loadRoleAndDepartmentOptions()
  }, [])

  const loadUsers = async () => {
    setUsersLoading(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, employee_no, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      setAdminUsers(data || [])
      setUsersError('')
    } catch (error) {
      console.error('Error loading users:', error)
      setAdminUsers([])
      setUsersError(error.message)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleUserFieldChange = (event) => {
    const { name, value } = event.target
    setNewUser((current) => ({ ...current, [name]: value }))
  }

  const openAddUserModal = () => {
    setFormError('')
    setFormMessage('')
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

      const result = await createAdminUser({
        ...newUser,
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
        roleId: availableRoles[0]?.id?.toString() || '',
        departmentId: availableDepartments[0]?.id?.toString() || '',
      })
      await loadUsers()
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
      setDeletingUserId(user.id)
      setUsersError('')

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) throw error

      await loadUsers()
      setFormMessage(`Deleted ${displayName} successfully.`)
    } catch (err) {
      console.error('Delete user error:', err)
      setUsersError(err.message)
      setFormError(`Failed to delete user: ${err.message}`)
    } finally {
      setDeletingUserId(null)
    }
  }

  const roleNameById = new Map(availableRoles.map((role) => [String(role.id), role.role_name]))
  const departmentNameById = new Map(availableDepartments.map((department) => [String(department.id), department.department_name]))

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

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <form className="search-container" onSubmit={(e) => { e.preventDefault(); loadUsers() }}>
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input-light" />
                  <button type="submit" className="search-icon">🔍</button>
                </form>
                <button onClick={openAddUserModal} className="btn-add-action">+ Add User</button>
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
            availableRoles={availableRoles}
            rolesLoading={rolesLoading}
            availableDepartments={availableDepartments}
            departmentsLoading={departmentsLoading}
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
