import React from 'react'

export default function SettingsProfileForm({ userProfile = {}, setUserProfile, className = '' }) {
  return (
    <div className={className}>
      <h2 className="settings-section-title">Edit Profile</h2>

      <div className="mb-24">
        <div className="form-row-3">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              value={userProfile.first_name}
              onChange={(e) => setUserProfile({ ...userProfile, first_name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Middle Name</label>
            <input type="text" placeholder="N/A" className="form-input" readOnly />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={userProfile.last_name}
              onChange={(e) => setUserProfile({ ...userProfile, last_name: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={userProfile.email}
              onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={userProfile.user_name}
              onChange={(e) => setUserProfile({ ...userProfile, user_name: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label>Contact No.</label>
            <input
              type="text"
              value={userProfile.contact_number}
              onChange={(e) => setUserProfile({ ...userProfile, contact_number: e.target.value })}
              className="form-input"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
