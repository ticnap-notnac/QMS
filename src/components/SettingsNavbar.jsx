import { NavLink } from 'react-router-dom'
import {
  User,
  Settings,
  FileText,
  ShieldCheck,
  ClipboardCheck,
  FolderKanban
} from 'lucide-react'

function SettingsNavbar({ userRole }) {

  return (
    <div className="settings-navbar">

      <NavLink
        to="/user-information"
        className={({ isActive }) =>
          `settings-nav-btn ${isActive ? 'active' : ''}`
        }
      >
        <User size={18} />
        User Information
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `settings-nav-btn ${isActive ? 'active' : ''}`
        }
      >
        <Settings size={18} />
        Settings
      </NavLink>

      <NavLink
        to="/reports"
        className={({ isActive }) =>
          `settings-nav-btn ${isActive ? 'active' : ''}`
        }
      >
        <FileText size={18} />
        Reports
      </NavLink>

      <NavLink
        to="/iso"
        className={({ isActive }) =>
          `settings-nav-btn ${isActive ? 'active' : ''}`
        }
      >
        <ClipboardCheck size={18} />
        ISO
      </NavLink>

      <NavLink
        to="/dcc"
        className={({ isActive }) =>
          `settings-nav-btn ${isActive ? 'active' : ''}`
        }
      >
        <FolderKanban size={18} />
        DCC
      </NavLink>

      {userRole === 'admin' && (
        <NavLink
          to="/admin-panel"
          className={({ isActive }) =>
            `settings-nav-btn ${isActive ? 'active' : ''}`
          }
        >
          <ShieldCheck size={18} />
          Admin Panel
        </NavLink>
      )}

    </div>
  )
}

export default SettingsNavbar