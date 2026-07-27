import { useNavigate } from 'react-router-dom'

export default function AdminNavbar({
  activeTab = 'Users',
}) {
  const navigate = useNavigate()
  const tabs = ['Users', 'Dept', 'Position', 'Roles', 'Permissions', 'Locations', 'Product Types', 'ISO Standards', 'Severity Category']

  const handleTabChange = (tab) => {
    const routeMap = {
      'Users': '/admin',
      'Dept': '/settings/departments',
      'Roles': '/settings/roles',
      'Permissions': '/settings/permissions',
      'Locations': '/settings/locations',
      'Product Types': '/settings/product-types',
      'ISO Standards': '/settings/iso-standards',
      'Severity Category': '/settings/severity-category',
      'Position': '/settings/positions'
    }
    navigate(routeMap[tab] || '/admin')
  }

  return (
    <div className="admin-top-nav">
      {/* Desktop Tabs */}
      <div className="admin-tabs desktop-only">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab-button ${activeTab === t ? 'active' : ''}`}
            onClick={() => handleTabChange(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mobile Dropdown (Hidden on Desktop) */}
      <div className="admin-tabs-mobile mobile-only">
        <select 
          className="admin-tab-select"
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value)}
        >
          {tabs.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
