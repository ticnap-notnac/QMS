import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import AddCategoryModal from '@/components/Modals/AddCategoryModal'
import BulkAddProductsModal from '@/components/Modals/BulkAddProductsModal'
import AdminListPanel from '@/components/Panels/AdminListPanel'
import SearchForm from '@/components/Forms/SearchForm'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
import { useProductsLogic } from '@/hooks/useAdminPanel.js'
import { hasAdminPanelAccess } from '@/utils/roleUtils.js'
import Toast from '@/components/UI/Toast.jsx'
import { Layers } from 'lucide-react'
import './AdminPanel.css'

export default function ProductsPage({ userRole, userPermissions }) {
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
    confirmDialogProps,
    isBulkModalOpen,
    openBulkModal,
    closeBulkModal,
    handleBulkSubmit,
    bulkLoading,
    productTypes
  } = useProductsLogic()

  const canAccess = hasAdminPanelAccess(userRole, userPermissions, ['manage_categories', 'manage_users'])

  return (
    <div className="page-root">
      {canAccess ? (
        <main className="page-main-wide">
          <h1 className="page-title">Manage Products</h1>
          <SettingsNavbar userRole={userRole} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="Products" />
                  </div>
                </div>

                <div className="admin-search-actions-row">
                  <div className="admin-search-container">
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reload} placeholder="Search products..." />
                  </div>
                  <div className="admin-actions-right" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={openBulkModal}
                      className="btn-add-action"
                      style={{ background: '#334155', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Layers size={16} /> Bulk Add Products
                    </button>
                    <button onClick={openCategoryModal} className="btn-add-action">+ Add Product</button>
                  </div>
                </div>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Click "+ Add Product" to add a single product, or "Bulk Add Products" to add multiple at once.</p>
                  <AdminListPanel {...listPanelProps} />
                </div>
              </div>
            </div>
          </div>

          <AddCategoryModal {...categoryModalProps} />
          <BulkAddProductsModal
            isOpen={isBulkModalOpen}
            onClose={closeBulkModal}
            onSubmit={handleBulkSubmit}
            existingProducts={listPanelProps.items || []}
            productTypes={productTypes}
            loading={bulkLoading}
          />
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
