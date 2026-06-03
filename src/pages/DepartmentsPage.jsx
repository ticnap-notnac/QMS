import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import AddCategoryModal from '@/components/Modals/AddCategoryModal'
import AdminListPanel from '@/components/Panels/AdminListPanel'
import SearchForm from '@/components/Forms/SearchForm'
import useDepartmentsLogic from '@/hooks/useDepartmentsLogic'
import './PagesStyles.css'

export default function DepartmentsPage({ userRole }) {
  const {
    searchQuery,
    setSearchQuery,
    reload,
    openCategoryModal,
    error,
    listPanelProps,
    categoryModalProps
  } = useDepartmentsLogic()

  return (
    <div className="page-root">
      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Manage Departments</h1>
          <SettingsNavbar userRole={userRole} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="Dept" />
                  </div>
                </div>

                <div className="admin-search-actions-row">
                  <div className="admin-search-container">
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reload} placeholder="Search departments..." />
                  </div>
                  <div className="admin-actions-right">
                    <button onClick={openCategoryModal} className="btn-add-action">+ Add Department</button>
                  </div>
                </div>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Use the add button above to create a new department.</p>
                  <AdminListPanel {...listPanelProps} />
                  {error && <p className="glass-card-subtext">{error}</p>}
                </div>
              </div>
            </div>
          </div>

          <AddCategoryModal {...categoryModalProps} />
        </main>
      ) : (
        <main className="page-main-centered">
          <h1 className="page-title">Access Denied</h1>
          <div className="access-denied-text">You don't have permission to access this page.</div>
        </main>
      )}
    </div>
  )
}
