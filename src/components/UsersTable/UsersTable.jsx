import { Pencil, Trash2 } from 'lucide-react'

export default function UsersTable({
  filteredUsers,
  deletingUserId,
  roleNameById,
  departmentNameById,
  siteNameById,
  onEdit,
  onDelete
}) {
  return (
    <div className="admin-users-table-wrap">
      <table className="admin-users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Site</th>
            <th>Contact</th>
            <th>Employee No.</th>
            <th style={{ width: '10%' }} className="text-center">STATUS</th>
            <th style={{ width: '12%' }} className="text-center">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'
            const roleName = user.role_name || roleNameById.get(String(user.role_id)) || '-'
            const departmentLabel = user.department_name || departmentNameById.get(String(user.department_id)) || '-'
            const siteLabel = user.site_name || siteNameById?.get(String(user.site_id)) || '—'
            const isDeleting = deletingUserId === user.id

            return (
              <tr key={user.id || user.auth_id || user.email}>
                <td>{fullName}</td>
                <td>{user.user_name || '-'}</td>
                <td>{user.email || '-'}</td>
                <td>{roleName}</td>
                <td>{departmentLabel}</td>
                <td>
                  <span style={{ fontSize: '11.5px', background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                    {siteLabel}
                  </span>
                </td>
                <td>{user.contact_number || '-'}</td>
                <td>{user.employee_no || '-'}</td>
                <td className="text-center">
                  <span className={`status-badge ${user.status === 'ACTIVE' ? 'status-active' :
                    user.status === 'DEACTIVATED' ? 'status-deactivated' :
                      'status-inactive'
                    }`}>
                    {user.status ?? 'ACTIVE'}
                  </span>
                </td>
                <td className="table-cell-actions">
                  <div className="action-buttons-wrapper">
                    <button
                      type="button"
                      className="action-btn edit-btn"
                      onClick={() => onEdit(user)}
                      title="Edit User"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="action-btn delete-btn"
                      onClick={() => onDelete(user)}
                      disabled={isDeleting}
                      title="Delete User"
                    >
                      {isDeleting ? '...' : <Trash2 size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
