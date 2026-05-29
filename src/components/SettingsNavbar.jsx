import {
  User,
  Settings,
  FileText,
  ShieldCheck,
  ClipboardCheck,
  FolderKanban
} from 'lucide-react'

function SettingsNavbar({ userRole, activePage, onNavigate }) {
  const navItem = (label, page, Icon) => {
    let isActive = activePage === page

    // Treat the Admin Panel tab as active for several admin-related pages (case-sensitive exact match)
    if (page === 'Admin Panel') {
      const adminPages = ['Admin Panel', 'Departments', 'Roles', 'Add User', 'Users']
      isActive = adminPages.includes(activePage)
    }

    return (
      <button
        type="button"
        className={`user-info-tab-button ${isActive ? 'active' : ''}`}
        onClick={() => onNavigate?.(page)}
      >
        <Icon size={16} />
        <span className="settings-nav-label">{label}</span>
      </button>
    )
  }

  return (
    <div className="settings-top-nav">
      {navItem('User Information', 'Profile', User)}
      {navItem('Settings', 'Settings', Settings)}
      
      {/* 🔒 Top-level Protection Lock */}
      {userRole === 'admin' && navItem('Admin Panel', 'Admin Panel', ShieldCheck)}
    </div>
  )
}

export default SettingsNavbar