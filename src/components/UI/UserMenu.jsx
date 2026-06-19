import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import '../components.css'

function UserMenu({ 
  isOpen, 
  onToggle, 
  onLogout, 
  onPageChange, 
  isNotificationsOpen, 
  onToggleNotifications 
}) {
  const [userProfile, setUserProfile] = useState({ name: 'Name of the User', role: 'Position' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('first_name, last_name, user_name, role_id')
            .eq('auth_id', user.id)
            .single()

          if (error) throw error
          if (data) {
            const fullName = `${data.first_name} ${data.last_name}`.trim()
            if (data.role_id) {
              const { data: roleData } = await supabase
                .from('roles')
                .select('role_name')
                .eq('id', data.role_id)
                .maybeSingle()

              setUserProfile({
                name: fullName || user.email,
                role: roleData?.role_name?.toLowerCase() || data.user_name || 'User',
              })
            } else {
              setUserProfile({ name: fullName || user.email, role: data.user_name || 'User' })
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [])

  return (
    <div className="user">
      <button
        className="bell-button"
        type="button"
        onClick={onToggleNotifications}
        aria-label="Show notifications"
        onMouseEnter={(e) => e.currentTarget.style.color = '#22d3ee'}
        onMouseLeave={(e) => e.currentTarget.style.color = isNotificationsOpen ? '#22d3ee' : '#94a3b8'}
      >
        <Bell size={18} />
        <span className="bell-dot" />
      </button>

      <button
        className="user-trigger"
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="avatar" aria-hidden="true"></div>
        <div className="user-info">
          <span className="user-name">{loading ? 'Loading...' : userProfile.name}</span>
          <span className="user-role">{userProfile.role}</span>
        </div>
      </button>

      {isOpen ? (
        <div className="user-menu" role="menu">
          <button className="menu-item" type="button" role="menuitem" onClick={() => onPageChange('Profile')}>User Information</button>
          <button className="menu-item" type="button" role="menuitem" onClick={() => onPageChange('Profile')}>Settings</button>
          <button className="menu-item logout" type="button" role="menuitem" onClick={() => onLogout && onLogout(true)}>Logout</button>
        </div>
      ) : null}
    </div>
  )
}

const menuItemStyle = {
  background: 'none',
  border: 'none',
  color: '#cbd5e1',
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '13px',
  cursor: 'pointer',
  borderRadius: '4px',
  width: '100%'
};

export default UserMenu