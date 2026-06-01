import { useState } from 'react'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import AdminNavbar from '@/components/AdminNavbar'
import AddCategoryModal from '@/components/Modals/AddCategoryModal'
import AdminListPanel from '@/components/AdminListPanel'
import SearchForm from '@/components/SearchForm'
import './PagesStyles.css'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'
import {
  loadDepartments as loadDepartmentsController,
  createDepartment as createDepartmentController,
  deleteDepartment as deleteDepartmentController,
} from '@/services/departmentService'

export default function DepartmentsPage({
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
    loadFn: loadDepartmentsController,
    createFn: createDepartmentController,
    deleteFn: deleteDepartmentController,
  })

  const { reloadLookups } = useLookup()

  const filtered = items.filter((d) => (d.department_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))

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
      setFormMessage(`Added department ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteDepartment = async (department) => {
    const confirmed = window.confirm(`Delete department "${department.department_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(department.id)
      await reloadLookups()
      // Server records department_delete; avoid duplicate client-side log

      setFormMessage(`Deleted department ${department.department_name} successfully.`)
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
          <h1 className="page-title">Manage Departments</h1>

          <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar
                      activeTab={activePage === 'Roles' ? 'Roles' : activePage === 'Departments' ? 'Dept' : activePage === 'Locations' ? 'Locations' : activePage === 'Product Types' ? 'Product Types' : activePage === 'ISO Standards' ? 'ISO Standards' : 'Users'}
                      onTabChange={(tab) => {
                        const map = {
                          Users: 'Admin Panel',
                          Dept: 'Departments',
                          Roles: 'Roles',
                          Locations: 'Locations',
                          'Product Types': 'Product Types',
                          'ISO Standards': 'ISO Standards',
                        }
                        onPageChange?.(map[tab] || 'Admin Panel')
                      }}
                    />
                  </div>
                </div>

                <div className="admin-search-actions-row">
                  <div className="admin-search-container">
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reload} placeholder="Search departments..." />
                  </div>
                  <div className="admin-actions-right">
                    <button onClick={openCategoryModal} className="btn-add-action">+ Add Department</button>
                  </div>
                </div>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Use the add button above to create a new department.</p>
                  <AdminListPanel
                    title="Available Departments"
                    items={filtered}
                    loading={loading}
                    labelKey="department_name"
                    onDelete={handleDeleteDepartment}
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
            title={'Create New Department'}
            label={'Department Name'}
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder={'Enter department name'}
            loading={false}
            error={formError}
            message={formMessage}
            submitLabel={'Create Department'}
            helperText={'Create a department entry that will be available in the user modal.'}
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
