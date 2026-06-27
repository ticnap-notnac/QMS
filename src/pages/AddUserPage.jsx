import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AddUserModal from '@/components/Modals/AddUserModal'
import EditUserModal from '@/components/Modals/EditUserModal'
import SearchForm from '@/components/Forms/SearchForm'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import UsersTable from '@/components/UsersTable/UsersTable'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
import { useAddUserLogic } from '@/hooks/useAdminPanel.js'
import SubmissionLoadingOverlay from '@/components/UI/SubmissionLoadingOverlay.jsx'
import Toast from '@/components/UI/Toast.jsx'
import './AdminPanel.css'

export default function AddUserPage({ userRole }) {
  const {
    searchQuery,
    setSearchQuery,
    reloadUsers,
    openAddUserModal,
    usersLoading,
    usersError,
    filteredUsers,
    usersTableProps,
    addUserModalProps,
    editUserModalProps,
    confirmDialogProps,
    toast,
    setToast,
    usersError
  } = useAddUserLogic()

  const isOverlayLoading = addUserModalProps.loading || editUserModalProps.loading
  const overlayMessage = addUserModalProps.loading ? 'Creating user account...' : 'Updating user account...'

  return (
    <div className="page-root">
      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Admin — Add User</h1>
          <SettingsNavbar userRole={userRole} />
          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="Users" />
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

                  {usersLoading ? (
                    <p className="glass-card-subtext">Loading users...</p>
                  ) : filteredUsers.length === 0 ? (
                    <div className="admin-users-empty">
                      <p>No users found.</p>
                      <span>Try clearing the search box or adding a user.</span>
                    </div>
                  ) : (
                    <UsersTable {...usersTableProps} />
                  )}
                </div>
              </div>
            </div>
          </div>

          <AddUserModal {...addUserModalProps} />
          <EditUserModal {...editUserModalProps} />
          <ConfirmDialog {...confirmDialogProps} />
          <SubmissionLoadingOverlay isOpen={isOverlayLoading} message={overlayMessage} />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          {usersError && !toast && <Toast message={usersError} type="error" onClose={() => {}} />}
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