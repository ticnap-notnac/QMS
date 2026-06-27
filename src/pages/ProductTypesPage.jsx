import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import AddCategoryModal from '@/components/Modals/AddCategoryModal'
import AdminListPanel from '@/components/Panels/AdminListPanel'
import SearchForm from '@/components/Forms/SearchForm'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
import { useProductTypesLogic } from '@/hooks/useAdminPanel.js'
import Toast from '@/components/UI/Toast.jsx'
import './AdminPanel.css'

export default function ProductTypesPage({ userRole }) {
  const {
    searchQuery,
    setSearchQuery,
    reload,
    openCategoryModal,
    error,
    toast,
    setToast,
    listPanelProps,
    categoryModalProps,
    confirmDialogProps
  } = useProductTypesLogic()

  return (
    <div className="page-root">
      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Manage Product Types</h1>
          <SettingsNavbar userRole={userRole} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="Product Types" />
                  </div>
                </div>

                <div className="admin-search-actions-row">
                  <div className="admin-search-container">
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reload} placeholder="Search product types..." />
                  </div>
                  <div className="admin-actions-right">
                    <button onClick={openCategoryModal} className="btn-add-action">+ Add Product Type</button>
                  </div>
                </div>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Use the add button above to create a new product type.</p>
                  <AdminListPanel {...listPanelProps} />
                </div>
              </div>
            </div>
          </div>

          <AddCategoryModal {...categoryModalProps} />
          <ConfirmDialog {...confirmDialogProps} />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          {error && !toast && <Toast message={error} type="error" onClose={() => {}} />}
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
