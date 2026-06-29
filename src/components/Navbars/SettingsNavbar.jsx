import {
  ClipboardCheck,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

function SettingsNavbar({ userRole }) {
  const navigate = useNavigate()
  const location = useLocation()
  const navItem = (label, path, Icon) => {
    let isActive = location.pathname === path

    if (path === '/settings') {
      const settingsPaths = ['/settings', '/settings/profile']
      isActive = settingsPaths.includes(location.pathname)
    }

    if (path === '/admin') {
      const adminPaths = ['/admin', '/settings/departments', '/settings/roles', '/settings/locations', '/settings/product-types', '/settings/users', '/settings/iso-standards']
      isActive = adminPaths.includes(location.pathname)
    }

    return (
      <button
        type="button"
        className={`user-info-tab-button ${isActive ? 'active' : ''}`}
        onClick={() => navigate(path)}
      >
        <Icon size={16} />
        <span className="settings-nav-label">{label}</span>
      </button>
    )
  }

  return (
    <div className="settings-top-nav">
      {navItem('Settings', '/settings', Settings)}
      {['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase()) && navItem('Audit Tools', '/audit-tools', ClipboardCheck)}
      
      {/* 🔒 Top-level Protection Lock */}
      {userRole === 'admin' && navItem('Admin Panel', '/admin', ShieldCheck)}
    </div>
  )
}

export default SettingsNavbar