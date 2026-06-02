import React from 'react'

export default function ProfileCard({ userProfile = {}, userRole = 'employee', userPosition = '-', ...rest }) {
  return (
    <>
      <div className="profile-header profile-header-strong user-info-header--profile">
        <div className="profile-avatar-large user-info-avatar--profile">
          {userProfile.first_name?.charAt(0) || 'U'}
        </div>
        <div className="profile-user-meta-stack">
          <h3 className="user-info-name user-info-name--profile">{userProfile.first_name} {userProfile.last_name}</h3>
          <p className="glass-card-subtext user-info-role--profile">{userRole}</p>
        </div>
      </div>

      <div className="profile-fields user-info-fields--profile">
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Username</span>
          <span className="profile-field-value user-info-field-value--profile">{userProfile.user_name || '-'}</span>
        </div>
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Employee Department</span>
          <span className="profile-field-value user-info-field-value--profile">IT Department</span>
        </div>
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Position</span>
          <span className="profile-field-value user-info-field-value--profile">{userPosition || '-'}</span>
        </div>
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Email Address</span>
          <span className="profile-field-value user-info-field-value--profile">{userProfile.email || '-'}</span>
        </div>
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Contact No.</span>
          <span className="profile-field-value user-info-field-value--profile">{userProfile.contact_number || '-'}</span>
        </div>
      </div>
    </>
  )
}
