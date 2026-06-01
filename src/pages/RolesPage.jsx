import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import AdminNavbar from '@/components/AdminNavbar'
import AddCategoryModal from '@/components/Modals/AddCategoryModal'
import AdminListPanel from '@/components/AdminListPanel'
import SearchForm from '@/components/SearchForm'
import './AdminPanel.css'
import './PagesStyles.css'
import useRolesPageLogic from '@/hooks/useRolesPageLogic'
import {
  loadRoles as loadRolesController,
  createRole as createRoleController,
  deleteRole as deleteRoleController,
} from '@/services/roleService'

export default function RolesPage({ activePage, onPageChange, isUserMenuOpen, onToggleMenu, onLogout, onToggleNotifications, isNotificationsOpen, userRole, userName, userPosition, setProfileTargetTab }) {
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
    error,
  } = useRolesPageLogic({ loadFn: loadRolesController, createFn: createRoleController, deleteFn: deleteRoleController })

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

          <AddCategoryModal isOpen={isCategoryModalOpen} onClose={closeCategoryModal} onSubmit={handleSubmitCategory} title="Create New Role" label="Role Name" value={categoryInput} onChange={(event) => setCategoryInput(event.target.value)} placeholder="Enter role name" loading={false} error={formError} message={formMessage} submitLabel="Create Role" helperText="Create a role entry that will be available in the user modal." />
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
