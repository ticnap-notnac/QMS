import { useState } from 'react'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import AdminNavbar from '@/components/AdminNavbar'
import AddCategoryModal from '@/components/AddCategoryModal'
import AdminListPanel from '@/components/AdminListPanel'
import SearchForm from '@/components/SearchForm'
import './PagesStyles.css'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, reload, createItem, deleteItem, error } = useCategoryManager({
    loadFn: loadRolesController,
    createFn: createRoleController,
    deleteFn: deleteRoleController,
  })

  const { reloadLookups } = useLookup()

  const filtered = items.filter((r) => (r.role_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))

  const openCategoryModal = () => {
    setFormError('')
    setFormMessage('')
    setCategoryInput('')
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
  }

  const handleSubmitCategory = async (event) => {
    event.preventDefault()
    const nextValue = categoryInput.trim()
    if (!nextValue) {
      setFormError('Please enter a name.')
      return
    }
    try {
      setFormError('')
      await createItem(nextValue)
      await reloadLookups()
      setFormMessage(`Added role ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteRole = async (role) => {
    const confirmed = window.confirm(`Delete role "${role.role_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(role.id)
      await reloadLookups()
      setFormMessage(`Deleted role ${role.role_name} successfully.`)
    } catch (err) {
      setFormError(err.message)
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
                          'ISO Module': 'ISO',
                        }
                        onPageChange?.(map[tab] || 'Admin Panel')
                      }}
                    />
                  </div>
                </div>

                <div className="admin-search-actions-row">
                  <div className="admin-search-container">
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reload} placeholder="Search roles..." />
                  </div>
                  <div className="admin-actions-right">
                    <button onClick={openCategoryModal} className="btn-add-action">+ Add Role</button>
                  </div>
                </div>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Use the add button above to create a new role.</p>
                  <AdminListPanel
                    title="Available Roles"
                    items={filtered}
                    loading={loading}
                    labelKey="role_name"
                    onDelete={handleDeleteRole}
                    deletingId={deletingId}
                    noMatchesText="No matches found."
                  />
                  {error ? <p className="glass-card-subtext">{error}</p> : null}
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
            loading={false}
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
