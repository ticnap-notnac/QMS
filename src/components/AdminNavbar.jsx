export default function AdminNavbar({
  activeTab = 'Users',
  onTabChange,
}) {
  const tabs = ['Users', 'Dept', 'Roles', 'ISO Module']

  return (
    <div className="admin-top-nav">
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab-button ${activeTab === t ? 'active' : ''} ${t === 'ISO Module' ? 'disabled' : ''}`}
            onClick={() => {
              if (t === 'ISO Module') return
              onTabChange?.(t)
            }}
            disabled={t === 'ISO Module'}
            title={t === 'ISO Module' ? 'ISO Module is unavailable for now' : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      
    </div>
  )
}
