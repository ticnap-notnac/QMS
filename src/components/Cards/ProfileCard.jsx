import React, { useState, useEffect } from 'react'

export default function ProfileCard({ userProfile = {}, userRole = 'employee', userPosition = '-', ...rest }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return (
    <>
      <div className="profile-header profile-header-strong user-info-header--profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="profile-avatar-large user-info-avatar--profile">
            {userProfile.first_name?.charAt(0) || 'U'}
          </div>
          <div className="profile-user-meta-stack">
            <h3 className="user-info-name user-info-name--profile">{userProfile.first_name} {userProfile.last_name}</h3>
            <p className="glass-card-subtext user-info-role--profile">{userRole}</p>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
            {getGreeting()}, {userProfile?.first_name || 'User'}!
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            {formattedDate} | {formattedTime}
          </p>
        </div>
      </div>

      <div className="profile-fields user-info-fields--profile">
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Username</span>
          <span className="profile-field-value user-info-field-value--profile">{userProfile.user_name || '-'}</span>
        </div>
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Employee Department</span>
          <span className="profile-field-value user-info-field-value--profile">{userProfile.department_name || userProfile.department || 'IT Department'}</span>
        </div>
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Role</span>
          <span className="profile-field-value user-info-field-value--profile" style={{ textTransform: 'capitalize' }}>{userProfile.role_name || userRole || '-'}</span>
        </div>
        <div className="profile-field user-info-field--profile">
          <span className="profile-field-label user-info-field-label--profile">Position</span>
          <span className="profile-field-value user-info-field-value--profile">{userProfile.position_name || userProfile.position || userPosition || '-'}</span>
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
