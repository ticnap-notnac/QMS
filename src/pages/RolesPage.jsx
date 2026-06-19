
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import AddCategoryModal from '@/components/Modals/AddCategoryModal'
import AdminListPanel from '@/components/Panels/AdminListPanel'
import SearchForm from '@/components/Forms/SearchForm'
import './PagesStyles.css'
import './AdminPanel.css'
import useRolesPageLogic from '@/hooks/useRolesPageLogic'
import {
  loadRoles as loadRolesController,
  createRole as createRoleController,
  deleteRole as deleteRoleController,
} from '@/services/roleService'

export default function RolesPage({
  userRole,
}) {
  const {
    items,
    filtered,
    loading,
    deletingId,
    reload,
    searchQuery,
    setSearchQuery,
    isCategoryModalOpen,
    openCategoryModal,
    closeCategoryModal,
    categoryInput,
    setCategoryInput,
    formError,
    formMessage,
    handleSubmitCategory,
    handleDeleteRole,
    creating,
    error,
  } = useRolesPageLogic({ loadFn: loadRolesController, createFn: createRoleController, deleteFn: deleteRoleController })

  return (
    <div className="page-root">


      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Manage Roles</h1>

          <SettingsNavbar userRole={userRole} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="Roles" />
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
                  <AdminListPanel title="Available Roles" items={filtered} loading={loading} labelKey="role_name" onDelete={handleDeleteRole} deletingId={deletingId} noMatchesText="No matches found." />
                  {error ? <p className="glass-card-subtext">{error}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <AddCategoryModal isOpen={isCategoryModalOpen} onClose={closeCategoryModal} onSubmit={handleSubmitCategory} title="Create New Role" label="Role Name" value={categoryInput} onChange={(event) => setCategoryInput(event.target.value)} placeholder="Enter role name" loading={creating} error={formError} message={formMessage} submitLabel="Create Role" helperText="Create a role entry that will be available in the user modal." />
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
