import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordSection({ passwords = {}, setPasswords }) {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="password-section">
      <h3 className="settings-password-title">Change Password</h3>

      <div className="form-row-2">
        <div className="form-group">
          <label>Current Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              placeholder="Enter current password"
              value={passwords.current || ''}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="form-input"
              style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
              title={showCurrent ? 'Hide password' : 'Show password'}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Enter new password"
              value={passwords.new || ''}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="form-input"
              style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
              title={showNew ? 'Hide password' : 'Show password'}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Confirm New Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={passwords.confirm || ''}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            className="form-input"
            style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            title={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
