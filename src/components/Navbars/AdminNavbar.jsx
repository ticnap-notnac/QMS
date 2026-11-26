import { useNavigate } from 'react-router-dom'
import {
  Users,
  Shield,
  KeyRound,
  Building2,
  Briefcase,
  MapPin,
  Package,
  Layers,
  Award,
  AlertTriangle,
  Plug,
  ShieldCheck
} from 'lucide-react'

const ADMIN_NAV_GROUPS = [
  {
    id: 'access',
    title: 'Identity & Access',
    icon: ShieldCheck,
    defaultPath: '/admin',
    items: [
      { id: 'Users', label: 'Users', path: '/admin', icon: Users, desc: 'User accounts & credentials' },
      { id: 'Roles', label: 'Roles', path: '/settings/roles', icon: Shield, desc: 'Role hierarchy & permissions' },
      { id: 'Permissions', label: 'Permissions', path: '/settings/permissions', icon: KeyRound, desc: 'Access control matrix' },
    ]
  },
  {
    id: 'organization',
    title: 'Organization',
    icon: Building2,
    defaultPath: '/settings/departments',
    items: [
      { id: 'Dept', label: 'Departments', path: '/settings/departments', icon: Building2, desc: 'Divisions & operational units' },
      { id: 'Position', label: 'Positions', path: '/settings/positions', icon: Briefcase, desc: 'Job titles & designations' },
      { id: 'Locations', label: 'Locations', path: '/settings/locations', icon: MapPin, desc: 'Facilities & site locations' },
    ]
  },
  {
    id: 'catalog',
    title: 'Master Catalog',
    icon: Package,
    defaultPath: '/settings/products',
    items: [
      { id: 'Products', label: 'Products', path: '/settings/products', icon: Package, desc: 'SKUs, materials & items' },
      { id: 'Product Types', label: 'Product Types', path: '/settings/product-types', icon: Layers, desc: 'Categories & classifications' },
    ]
  },
  {
    id: 'quality',
    title: 'Quality & Standards',
    icon: Award,
    defaultPath: '/settings/iso-standards',
    items: [
      { id: 'ISO Standards', label: 'ISO Standards', path: '/settings/iso-standards', icon: Award, desc: 'ISO clauses & compliance policies' },
      { id: 'Non-Conformance Types', label: 'Non-Conformance', path: '/settings/non-conformance-types', icon: AlertTriangle, desc: 'Defect classifications & severity' },
    ]
  },
  {
    id: 'system',
    title: 'System',
    icon: Plug,
    defaultPath: '/settings/integrations',
    items: [
      { id: 'Integrations', label: 'Integrations', path: '/settings/integrations', icon: Plug, desc: 'External API connections & services' },
    ]
  }
]

export default function AdminNavbar({
  activeTab = 'Users',
}) {
  const navigate = useNavigate()

  // Resolve currently active group & item
  let activeGroup = null
  let activeItem = null

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (activeTab === item.id || (item.id === 'Non-Conformance Types' && activeTab === 'Severity Category')) {
        activeGroup = group
        activeItem = item
        break
      }
    }
    if (activeItem) break
  }

  if (!activeGroup || !activeItem) {
    activeGroup = ADMIN_NAV_GROUPS[0]
    activeItem = ADMIN_NAV_GROUPS[0].items[0]
  }

  const handleCategoryClick = (group) => {
    if (group.id !== activeGroup.id) {
      navigate(group.defaultPath)
    }
  }

  const handleItemClick = (item) => {
    navigate(item.path)
  }

  return (
    <nav className="admin-two-tier-nav" aria-label="Admin Navigation">
      {/* Tier 1: Category Tabs Bar (Spanning Full Width across 5 Columns) */}
      <div className="admin-tier1-track desktop-only">
        {ADMIN_NAV_GROUPS.map((group) => {
          const isCategoryActive = group.id === activeGroup.id
          const CategoryIcon = group.icon
          return (
            <button
              key={group.id}
              type="button"
              className={`admin-category-tab ${isCategoryActive ? 'active' : ''}`}
              onClick={() => handleCategoryClick(group)}
              title={`Switch category to ${group.title}`}
            >
              <CategoryIcon size={15} className="admin-category-icon" />
              <span>{group.title}</span>
              {isCategoryActive && <span className="admin-category-indicator" />}
            </button>
          )
        })}
      </div>

      {/* Tier 2: Sub-items Bar (Full Width Responsive Cards) */}
      <div className="admin-tier2-track desktop-only">
        <div className="admin-tier2-items-grid">
          {activeGroup.items.map((item) => {
            const isItemActive = activeItem.id === item.id
            const ItemIcon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-subitem-card-btn ${isItemActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <div className="admin-subitem-icon-box">
                  <ItemIcon size={16} />
                </div>
                <div className="admin-subitem-meta">
                  <span className="admin-subitem-title">{item.label}</span>
                  {item.desc && <span className="admin-subitem-subtitle">{item.desc}</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile Select (Fallback for small screens) */}
      <div className="admin-mobile-select-wrap mobile-only">
        <select
          className="admin-mobile-nav-select"
          value={activeItem.id}
          onChange={(e) => {
            const selectedItem = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === e.target.value)
            if (selectedItem) navigate(selectedItem.path)
          }}
        >
          {ADMIN_NAV_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.title}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </nav>
  )
}
