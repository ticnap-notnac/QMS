import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff } from 'lucide-react'

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
  availablePositions = [],
  positionsLoading,
  availableTeamLeaders = [],
  loading,
  error,
  message,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [tlSearch, setTlSearch] = useState('')

  const filteredTeamLeaders = useMemo(() => {
    const q = tlSearch.trim().toLowerCase()
    if (!q) return availableTeamLeaders || []
    return (availableTeamLeaders || []).filter((tl) => {
      const label = `${tl.first_name || ''} ${tl.last_name || ''} ${tl.user_name || ''} ${tl.department_name || ''}`.toLowerCase()
      return label.includes(q)
    })
  }, [availableTeamLeaders, tlSearch])

  if (!isOpen) {
    return null
  }

  return createPortal(
    <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={onClose}>
      <div
        className="modal modal-wide compact-modal"
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
          {error && <div className="user-info-error" style={{ padding: '6px 12px', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
          {message && <div className="user-info-success" style={{ padding: '6px 12px', fontSize: '13px', marginBottom: '8px' }}>{message}</div>}

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">First Name: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span></span>
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
              <span className="small-label">Last Name: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span></span>
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
              <span className="small-label">Password: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span></span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  className="form-input-reports"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  style={{ width: '100%', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
          </div>

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">
                Email Address: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'none', marginLeft: '6px', fontWeight: 'normal' }}>(Gmail only)</span>
              </span>
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
              <span className="small-label">Username: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span></span>
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
              <span className="small-label">Department: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span></span>
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
              <span className="small-label">Site: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span></span>
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

            <label className="panel-column">
              <span className="small-label">Position:</span>
              <select
                name="positionId"
                value={formData.positionId || ''}
                onChange={onChange}
                className="form-input-reports"
                disabled={positionsLoading || !availablePositions?.length}
              >
                <option value="">
                  {positionsLoading ? 'Loading positions...' : 'Select a position'}
                </option>
                {(availablePositions || []).map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.position_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">Filter Team Leader:</span>
              <input
                type="text"
                value={tlSearch}
                onChange={(e) => setTlSearch(e.target.value)}
                className="form-input-reports"
                placeholder="Filter Team Leaders..."
              />
            </label>

            <label className="panel-column" style={{ gridColumn: 'span 2' }}>
              <span className="small-label">Assigned Team Leader:</span>
              <select
                name="teamLeaderId"
                value={formData.teamLeaderId || ''}
                onChange={onChange}
                className="form-input-reports"
              >
                <option value="">No Team Leader (Unassigned)</option>
                {filteredTeamLeaders.map((tl) => {
                  const fullName = `${tl.first_name || ''} ${tl.last_name || ''}`.trim() || tl.user_name || tl.email
                  return (
                    <option key={tl.id} value={tl.id}>
                      {fullName} {tl.department_name ? `(${tl.department_name})` : ''}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>

          <div className="modal-submit-row">
            <button
              type="button"
              className="btn-secondary-light"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn-gradient-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default AddUserModal
