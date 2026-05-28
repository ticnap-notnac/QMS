import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import AddCategoryModal from '@/components/AddCategoryModal'
import './PagesStyles.css'
import {
  loadRoles as loadRolesController,
  createRole as createRoleController,
  deleteRole as deleteRoleController,
} from '@/controllers/roleController'

export default function RolesPage({
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
  const [availableRoles, setAvailableRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [deletingRoleId, setDeletingRoleId] = useState(null)
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const loadRoles = async () => {
    setRolesLoading(true)
    try {
      const roles = await loadRolesController()
      setAvailableRoles(roles)
      setFormError('')
    } catch (err) {
      console.error('Error loading roles:', err)
      setAvailableRoles([])
      setFormError(err.message)
    } finally {
      setRolesLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const handleSearchSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    await loadRoles()
  }

  const filteredRoles = availableRoles.filter((r) => (r.role_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))

  const openCategoryModal = () => {
    setFormError('')
    setFormMessage('')
    setCategoryInput('')
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    if (!roleSubmitting) {
      setIsCategoryModalOpen(false)
      setCategoryInput('')
    }
  }

  const handleSubmitCategory = async (event) => {
    event.preventDefault()
    const nextValue = categoryInput.trim()
    if (!nextValue) {
      setFormError('Please enter a name.')
      return
    }
    try {
      setRoleSubmitting(true)
      setFormError('')
      await createRoleController(nextValue)
      setFormMessage(`Added role ${nextValue} successfully.`)
      await loadRoles()
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setRoleSubmitting(false)
    }
  }

  const handleDeleteRole = async (role) => {
    const confirmed = window.confirm(`Delete role "${role.role_name}"?`)
    if (!confirmed) return
    try {
      setDeletingRoleId(role.id)
      setFormError('')
      await deleteRoleController(role.id)
      setFormMessage(`Deleted role ${role.role_name} successfully.`)
      await loadRoles()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setDeletingRoleId(null)
    }
  }

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
          <h1 className="page-title">Manage Roles</h1>
          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <form className="search-container" onSubmit={handleSearchSubmit}>
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-light"
                  />
                  <button type="submit" className="search-icon">🔍</button>
                </form>
                <button onClick={openCategoryModal} className="btn-add-action" disabled={roleSubmitting}>{roleSubmitting ? 'Adding...' : '+ Add Role'}</button>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Use the add button above to create a new role.</p>
                  <div className="admin-list-panel">
                    <div className="admin-list-panel-header">
                      <h4 className="glass-card-subtext">Available Roles</h4>
                      <span>{filteredRoles.length}</span>
                    </div>
                    {rolesLoading ? (
                      <p className="glass-card-subtext">Loading roles...</p>
                    ) : filteredRoles.length === 0 ? (
                      <p className="glass-card-subtext">No matches found.</p>
                    ) : (
                      <div className="admin-list-items">
                        {filteredRoles.map((role) => (
                          <div className="admin-list-item" key={role.id}>
                            <span>{role.role_name}</span>
                            <button type="button" className="btn-delete-user" onClick={() => handleDeleteRole(role)} disabled={deletingRoleId === role.id}>{deletingRoleId === role.id ? 'Deleting...' : 'Delete'}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AddCategoryModal
            isOpen={isCategoryModalOpen}
            onClose={closeCategoryModal}
            onSubmit={handleSubmitCategory}
            title={'Create New Role'}
            label={'Role Name'}
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder={'Enter role name'}
            loading={roleSubmitting}
            error={formError}
            message={formMessage}
            submitLabel={'Create Role'}
            helperText={'Create a role entry that will be available in the user modal.'}
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
