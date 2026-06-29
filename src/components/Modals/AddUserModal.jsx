function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
  onChange,
  formData,
  availableRoles,
  rolesLoading,
  availableDepartments,
  departmentsLoading,
  availableSites,
  sitesLoading,
  loading,
  error,
  message,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="add-user-title" className="modal-title">
            Create New User
          </h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close add user dialog">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit} autoComplete="off">
          <p className="glass-card-subtext">
            Create the auth account and matching profile record for a new user.
          </p>

          {error && <div className="user-info-error">{error}</div>}
          {message && <div className="user-info-success">{message}</div>}

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">First Name: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={onChange}
                className="form-input-reports"
                placeholder="Enter first name"
              />
            </label>

            <label className="panel-column">
              <span className="small-label">Last Name: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={onChange}
                className="form-input-reports"
                placeholder="Enter last name"
              />
            </label>

            <label className="panel-column">
              <span className="small-label">Password: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                className="form-input-reports"
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">Email Address: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                className="form-input-reports"
                placeholder="Enter email address"
                autoComplete="new-password"
              />
            </label>

            <label className="panel-column">
              <span className="small-label">Username: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={onChange}
                className="form-input-reports"
                placeholder="Enter username"
                autoComplete="new-password"
              />
            </label>

            <label className="panel-column">
              <span className="small-label">Contact Number:</span>
              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={onChange}
                className="form-input-reports"
                placeholder="Enter contact number"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">Role: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <select
                name="roleId"
                value={formData.roleId}
                onChange={onChange}
                className="form-input-reports"
                disabled={rolesLoading || availableRoles.length === 0}
              >
                <option value="">
                  {rolesLoading ? 'Loading roles...' : 'Select a role'}
                </option>
                {!rolesLoading && availableRoles.length === 0 ? (
                  <option value="" disabled>
                    No roles available
                  </option>
                ) : null}
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="panel-column">
              <span className="small-label">Department: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={onChange}
                className="form-input-reports"
                disabled={departmentsLoading || availableDepartments.length === 0}
              >
                <option value="">
                  {departmentsLoading ? 'Loading departments...' : 'Select a department'}
                </option>
                {!departmentsLoading && availableDepartments.length === 0 ? (
                  <option value="" disabled>
                    No departments available
                  </option>
                ) : null}
                {availableDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.department_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="panel-column">
              <span className="small-label">Site: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <select
                name="siteId"
                value={formData.siteId || ''}
                onChange={onChange}
                className="form-input-reports"
                disabled={sitesLoading || !availableSites?.length}
              >
                <option value="">
                  {sitesLoading ? 'Loading sites...' : 'Select a site'}
                </option>
                {(availableSites || []).map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.site_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal-submit-row">
            <button className="btn-add-action" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddUserModal