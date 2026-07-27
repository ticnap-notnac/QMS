import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import RoleModal from '@/components/Modals/RoleModal'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
import AdminListPanel from '@/components/Panels/AdminListPanel'
import SearchForm from '@/components/Forms/SearchForm'
import Toast from '@/components/UI/Toast.jsx'
import './AdminPanel.css'
import useRolesPageLogic from '@/hooks/useRolesPageLogic'
import {
  loadRoles as loadRolesController,
  createRole as createRoleController,
  updateRole as updateRoleController,
  deleteRole as deleteRoleController,
} from '@/services/roleService'
import { isAdminRole } from '@/utils/roleUtils.js'

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
    availablePositions,
    selectedPositionIds,
    togglePositionSelection,
    formError,
    formMessage,
    toast,
    setToast,
    pageError,
    handleSubmitCategory,
    handleDeleteRole,
    handleEditRole,
    creating,
    categoryError,
    confirmDialogProps,
    editingItem,
  } = useRolesPageLogic({ loadFn: loadRolesController, createFn: createRoleController, updateFn: updateRoleController, deleteFn: deleteRoleController })

  return (
    <div className="page-root">


      {isAdminRole(userRole) ? (
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
                  <p className="glass-card-subtext">Please click the "+ Add Role" button to add a new Role.</p>
                  <AdminListPanel
                    title="Available Roles"
                    items={filtered}
                    loading={loading}
                    labelKey="role_name"
                    onEdit={handleEditRole}
                    onDelete={handleDeleteRole}
                    deletingId={deletingId}
                    noMatchesText="No matches found."
                  />
                </div>
              </div>
            </div>
          </div>

          <RoleModal
            isOpen={isCategoryModalOpen}
            onClose={closeCategoryModal}
            onSubmit={handleSubmitCategory}
            title={editingItem ? 'Edit Role' : 'Create New Role'}
            roleName={categoryInput}
            onRoleNameChange={(event) => setCategoryInput(event.target.value)}
            availablePositions={availablePositions}
            roles={items}
            editingRoleId={editingItem?.id}
            selectedPositionIds={selectedPositionIds}
            onPositionToggle={togglePositionSelection}
            loading={creating || loading}
            error={formError}
            message={formMessage}
            submitLabel={editingItem ? 'Save Changes' : 'Create Role'}
            helperText={editingItem ? 'Modify the role name and select which positions (job titles) belong to this role.' : 'Create a new role and select which positions (job titles) belong to it.'}
          />
          <ConfirmDialog {...confirmDialogProps} />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          {pageError && !toast && <Toast message={pageError} type="error" onClose={() => {}} />}
          {categoryError && !toast && <Toast message={categoryError} type="error" onClose={() => {}} />}
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
