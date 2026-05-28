import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import AddUserModal from '@/components/AddUserModal'
import { supabase } from '@/utils/supabase'
import { createAdminUser } from '@/controllers/adminController'
// SettingsNavbar intentionally not used here to preserve Admin layout
import './PagesStyles.css'

export default function AdminPanelPage({
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
  const [adminTab, setAdminTab] = useState('Users')
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [roleData, setRoleData] = useState('')
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
  const [roleSubmitting, setRoleSubmitting] = useState(false)
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

  const loadRoles = async () => {
    setRolesLoading(true)

    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, role_name')
        .order('role_name', { ascending: true })

      if (error) {
        throw error
      }

      const roles = data || []

      setAvailableRoles(roles)
      setNewUser((current) => ({
        ...current,
        roleId: current.roleId || roles[0]?.id?.toString() || '',
      }))

      return roles
    } catch (error) {
      console.error('Error loading roles:', error)
      setAvailableRoles([])
      setFormError(error.message)
      return []
    } finally {
      setRolesLoading(false)
    }
  }

  const loadDepartments = async () => {
    setDepartmentsLoading(true)

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_name')
        .order('department_name', { ascending: true })

      if (error) {
        throw error
      }

      const departments = data || []

      setAvailableDepartments(departments)
      setNewUser((current) => ({
        ...current,
        departmentId: current.departmentId || departments[0]?.id?.toString() || '',
      }))

      return departments
    } catch (error) {
      console.error('Error loading departments:', error)
      setAvailableDepartments([])
      setFormError(error.message)
      return []
    } finally {
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
    loadDepartments()
  }, [])

  const loadUsers = async () => {
    setUsersLoading(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, employee_no, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

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

  useEffect(() => {
    if (adminTab === 'Users') {
      loadUsers()
    }
  }, [adminTab])

  useEffect(() => {
    if (isAddUserModalOpen && availableRoles.length === 0) {
      loadRoles()
    }
  }, [isAddUserModalOpen])

  useEffect(() => {
    if (isAddUserModalOpen && availableDepartments.length === 0) {
      loadDepartments()
    }
  }, [isAddUserModalOpen])

  useEffect(() => {
    setFormError('')
    setFormMessage('')
  }, [adminTab])

  useEffect(() => {
    if (!isAddUserModalOpen) {
      setFormError('')
      setFormMessage('')
    }
  }, [isAddUserModalOpen])

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
    if (!submitting) {
      setIsAddUserModalOpen(false)
    }
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

  const handleAddDepartment = () => {
    const nextDepartment = departmentName.trim()

    if (!nextDepartment) {
      return
    }

    const insertDepartment = async () => {
      try {
        setFormError('')
        setFormMessage('')

        const { error } = await supabase
          .from('departments')
          .insert([{ department_name: nextDepartment }])

        if (error) {
          throw error
        }

        setDepartmentName('')
        setFormMessage(`Added department ${nextDepartment} successfully.`)
        await loadDepartments()
      } catch (err) {
        setFormError(err.message)
      }
    }

    insertDepartment()
  }

  const handleAddRole = async () => {
    const nextRole = roleData.trim()

    if (!nextRole) {
      return
    }

    try {
      setRoleSubmitting(true)
      setFormError('')
      setFormMessage('')

      const { error } = await supabase
        .from('roles')
        .insert([{ role_name: nextRole }])

      if (error) {
        throw error
      }

      setRoleData('')
      setFormMessage(`Added role ${nextRole} successfully.`)
      await loadRoles()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setRoleSubmitting(false)
    }
  }

  const handleDeleteUser = async (user) => {
    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.user_name || user.email
    const confirmed = window.confirm(
      `This will delete ${displayName} from the users table.\n\nThis does not remove the Supabase auth account unless you also delete it from Auth separately. Continue?`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingUserId(user.id)
      setUsersError('')

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) {
        throw error
      }

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

    if (!search) {
      return true
    }

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
          <h1 className="page-title">Admin Panel</h1>

          {/* Symmetrical Master Dashboard Menu Navigation Bar Row */}
          <div className="user-info-tabs">
            <button
              onClick={() => onPageChange('Profile')}
              className="user-info-tab-button"
            >
              User Information
            </button>
            <button
              onClick={() => { onPageChange('Profile'); setProfileTargetTab('Settings'); }}
              className="user-info-tab-button"
            >
              Settings
            </button>
            <button
              className="user-info-tab-button active"
            >
              Admin Panel
            </button>
          </div>

          {/* Outer Glassmorphic Border Canvas Frame */}
            <div className="glass-card-rounded-bottom">
              <div className="admin-inner-panel">
                {/* Row 1: Subpill filters selection header row */}
                <div className="tab-filter">
              {['Users', 'Dept', 'Roles', 'ISO Module'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAdminTab(tab)}
                      className={`filter-button ${adminTab === tab ? 'active' : ''}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Row 2: Search Input and Actions Filter Workspace Bar */}
            <div className="search-row">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-light"
                />
                <span className="search-icon">🔍</span>
              </div>
              
              <button
                onClick={adminTab === 'Users' ? openAddUserModal : adminTab === 'Roles' ? handleAddRole : adminTab === 'Dept' ? handleAddDepartment : () => {}}
                className="btn-add-action"
                  disabled={adminTab === 'Roles' && roleSubmitting}
              >
                {adminTab === 'Roles' && roleSubmitting ? 'Adding...' : `+ Add ${adminTab === 'ISO Module' ? 'Modules' : adminTab === 'Users' ? 'User' : adminTab}`}
              </button>
            </div>

                {/* Row 3: Inner Component Sheets Workspace Canvas */}
                <div className="glass-card-content">
                  {adminTab === 'Users' && (
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
                                      <button
                                        type="button"
                                        className="btn-delete-user"
                                        onClick={() => handleDeleteUser(user)}
                                        disabled={isDeleting}
                                      >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {adminTab === 'Dept' && (
                    <div className="panel-narrow">
                      <h3 className="glass-card-heading">Manage Departments</h3>
                      <div className="panel-column">
                        <label className="small-label">Department Name</label>
                        <input
                          type="text"
                          placeholder="Enter department name"
                          value={departmentName}
                          onChange={(e) => setDepartmentName(e.target.value)}
                          className="form-input-reports"
                        />
                      </div>
                    </div>
                  )}

                  {adminTab === 'Roles' && (
                    <div className="panel-narrow">
                      <h3 className="glass-card-heading">Manage Roles</h3>
                      <div className="panel-column">
                        <label className="small-label">Role Name</label>
                        <input
                          type="text"
                          placeholder="Enter role name"
                          value={roleData}
                          onChange={(e) => setRoleData(e.target.value)}
                          className="form-input-reports"
                        />
                      </div>
                    </div>
                  )}

                  {adminTab === 'ISO Module' && (
                    <div>
                      <h3 className="glass-card-heading">Manage ISO Modules</h3>
                      <p className="glass-card-subtext">ISO module management functionality subsystem streams window</p>
                    </div>
                  )}
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
          <div className="access-denied-text">
            You don't have permission to access the Admin Panel. Only administrators can access this page.
          </div>
        </main>
      )}
    </div>
  )
}