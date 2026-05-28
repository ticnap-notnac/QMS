import {
  User,
  Settings,
  FileText,
  ShieldCheck,
  ClipboardCheck,
  FolderKanban
} from 'lucide-react'

function SettingsNavbar({ userRole, activePage, onNavigate }) {
  const navItem = (label, page, Icon) => (
    <button
      type="button"
      className={`user-info-tab-button ${activePage === page ? 'active' : ''}`}
      onClick={() => onNavigate?.(page)}
    >
      <Icon size={16} />
      <span className="settings-nav-label">{label}</span>
    </button>
  )

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