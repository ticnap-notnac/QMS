import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AddUserModal from '@/components/Modals/AddUserModal'
import EditUserModal from '@/components/Modals/EditUserModal'
import ManageTeamRosterModal from '@/components/Modals/ManageTeamRosterModal'
import SearchForm from '@/components/Forms/SearchForm'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import UsersTable from '@/components/UsersTable/UsersTable'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
import { useAddUserLogic } from '@/hooks/useAdminPanel.js'
import SubmissionLoadingOverlay from '@/components/UI/SubmissionLoadingOverlay.jsx'
import Toast from '@/components/UI/Toast.jsx'
import './AdminPanel.css'

import { isAdminRole } from '@/utils/roleUtils.js'

export default function AddUserPage({ userRole }) {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    reloadUsers,
    openAddUserModal,
    openManageRosterModal,
    usersLoading,
    usersError,
    filteredUsers,
    usersTableProps,
    addUserModalProps,
    editUserModalProps,
    manageRosterModalProps,
    confirmDialogProps,
    toast,
    setToast
  } = useAddUserLogic({ currentUserRole: userRole })

  const isOverlayLoading = addUserModalProps.loading || editUserModalProps.loading || manageRosterModalProps?.saving
  const overlayMessage = addUserModalProps.loading
    ? 'Creating user account...'
    : editUserModalProps.loading
      ? 'Updating user account...'
      : 'Updating team roster...'

  return (
    <div className="page-root">
      {isAdminRole(userRole) ? (
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
                  <div className="admin-search-container" style={{ display: 'flex', gap: '12px' }}>
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reloadUsers} placeholder="Search..." />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="admin-status-select"
                    >
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="DEACTIVATED">Deactivated</option>
                    </select>
                  </div>
                  <div className="admin-actions-right" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={openManageRosterModal}
                      className="btn-add-action"
                      style={{ background: '#0f172a' }}
                    >
                      <span>Manage Team Roster</span>
                    </button>
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
          <ManageTeamRosterModal {...manageRosterModalProps} />
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
