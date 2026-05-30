export default function AdminNavbar({
  activeTab = 'Users',
  onTabChange,
}) {
  const tabs = ['Users', 'Dept', 'Roles', 'Locations', 'Product Types', 'ISO Standards']

  return (
    <div className="admin-top-nav">
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab-button ${activeTab === t ? 'active' : ''}`}
            onClick={() => onTabChange?.(t)}
          >
            {t}
          </button>
        ))}
      </div>

      
    </div>
  )
}
