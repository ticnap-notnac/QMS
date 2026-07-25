import { useNavigate } from 'react-router-dom'

export default function AdminNavbar({
  activeTab = 'Users',
}) {
  const navigate = useNavigate()
  const tabs = ['Users', 'Dept', 'Roles', 'Permissions', 'Locations', 'Product Types', 'ISO Standards', 'Severity Category', 'Position']

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
      <div className="admin-tabs">
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
    </div>
  )
}
