import React from 'react'

export default function PasswordSection({ passwords = {}, setPasswords }) {
  return (
    <div className="password-section">
      <h3 className="settings-password-title">Change Password</h3>

      <div className="form-row-2">
        <div className="form-group">
          <label>Current Password</label>
          <input
            type="password"
            placeholder="Enter current password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Confirm New Password</label>
        <input
          type="password"
          placeholder="Confirm new password"
          value={passwords.confirm}
          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          className="form-input"
        />
      </div>
    </div>
  )
}
