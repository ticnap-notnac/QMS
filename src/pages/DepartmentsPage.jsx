import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import AddCategoryModal from '@/components/AddCategoryModal'
import './PagesStyles.css'
import {
  loadDepartments as loadDepartmentsController,
  createDepartment as createDepartmentController,
  deleteDepartment as deleteDepartmentController,
} from '@/controllers/departmentController'

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
  const [availableDepartments, setAvailableDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [deletingDepartmentId, setDeletingDepartmentId] = useState(null)
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const loadDepartments = async () => {
    setDepartmentsLoading(true)
    try {
      const departments = await loadDepartmentsController()
      setAvailableDepartments(departments)
      setFormError('')
    } catch (err) {
      console.error('Error loading departments:', err)
      setAvailableDepartments([])
      setFormError(err.message)
    } finally {
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  const handleSearchSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    await loadDepartments()
  }

  const filteredDepartments = availableDepartments.filter((d) => (d.department_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))

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
      await createDepartmentController(nextValue)
      setFormMessage(`Added department ${nextValue} successfully.`)
      await loadDepartments()
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setRoleSubmitting(false)
    }
  }

  const handleDeleteDepartment = async (department) => {
    const confirmed = window.confirm(`Delete department "${department.department_name}"?`)
    if (!confirmed) return
    try {
      setDeletingDepartmentId(department.id)
      setFormError('')
      await deleteDepartmentController(department.id)
      setFormMessage(`Deleted department ${department.department_name} successfully.`)
      await loadDepartments()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setDeletingDepartmentId(null)
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
          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <form className="search-container" onSubmit={handleSearchSubmit}>
                  <input
                    type="text"
                    placeholder="Search departments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-light"
                  />
                  <button type="submit" className="search-icon">🔍</button>
                </form>
                <button onClick={openCategoryModal} className="btn-add-action" disabled={roleSubmitting}>{roleSubmitting ? 'Adding...' : '+ Add Department'}</button>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Use the add button above to create a new department.</p>
                  <div className="admin-list-panel">
                    <div className="admin-list-panel-header">
                      <h4 className="glass-card-subtext">Available Departments</h4>
                      <span>{filteredDepartments.length}</span>
                    </div>
                    {departmentsLoading ? (
                      <p className="glass-card-subtext">Loading departments...</p>
                    ) : filteredDepartments.length === 0 ? (
                      <p className="glass-card-subtext">No matches found.</p>
                    ) : (
                      <div className="admin-list-items">
                        {filteredDepartments.map((department) => (
                          <div className="admin-list-item" key={department.id}>
                            <span>{department.department_name}</span>
                            <button type="button" className="btn-delete-user" onClick={() => handleDeleteDepartment(department)} disabled={deletingDepartmentId === department.id}>{deletingDepartmentId === department.id ? 'Deleting...' : 'Delete'}</button>
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
            title={'Create New Department'}
            label={'Department Name'}
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder={'Enter department name'}
            loading={roleSubmitting}
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
