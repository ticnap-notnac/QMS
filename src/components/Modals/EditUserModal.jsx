import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

function EditUserModal({
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
  loading,
  error,
  message,
}) {
  const [showPassword, setShowPassword] = useState(false)

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="edit-user-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="edit-user-title" className="modal-title">Edit User</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close edit user dialog">×</button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          {error && <div className="user-info-error">{error}</div>}
          {message && <div className="user-info-success">{message}</div>}

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">First Name: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input type="text" name="firstName" value={formData.firstName} onChange={onChange} className="form-input-reports" placeholder="Enter first name" />
            </label>

            <label className="panel-column">
              <span className="small-label">Last Name: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input type="text" name="lastName" value={formData.lastName} onChange={onChange} className="form-input-reports" placeholder="Enter last name" />
            </label>

            <label className="panel-column">
              <span className="small-label">Status: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <select name="status" value={formData.status ?? 'ACTIVE'} onChange={onChange} className="form-input-reports">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DEACTIVATED">DEACTIVATED</option>
              </select>
            </label>
          </div>

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">Email Address: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input type="email" name="email" value={formData.email} onChange={onChange} className="form-input-reports" placeholder="Enter email address" />
            </label>

            <label className="panel-column">
              <span className="small-label">Username: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <input type="text" name="userName" value={formData.userName} onChange={onChange} className="form-input-reports" placeholder="Enter username" />
            </label>

            <label className="panel-column">
              <span className="small-label">Contact Number:</span>
              <input type="text" name="contactNumber" value={formData.contactNumber} onChange={onChange} className="form-input-reports" placeholder="Enter contact number" />
            </label>
          </div>

          <div className="modal-grid-3">


            <label className="panel-column">
              <span className="small-label">Department: <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span></span>
              <select name="departmentId" value={formData.departmentId} onChange={onChange} className="form-input-reports" disabled={departmentsLoading || availableDepartments.length === 0}>
                <option value="">{departmentsLoading ? 'Loading departments...' : 'Select a department'}</option>
                {availableDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.department_name}</option>
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
                <option value="">{sitesLoading ? 'Loading sites...' : 'Select a site'}</option>
                {(availableSites || []).map((site) => (
                  <option key={site.id} value={site.id}>{site.site_name}</option>
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
                <option value="">{positionsLoading ? 'Loading positions...' : 'Select a position'}</option>
                {(availablePositions || []).map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.position_name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal-grid-3">
            <label className="panel-column">
              <span className="small-label">New Password (Reset):</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password || ''}
                  onChange={onChange}
                  className="form-input-reports"
                  placeholder="Leave blank to keep current"
                  minLength={6}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          <div className="modal-submit-row">
            <button className="btn-add-action" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserModal
