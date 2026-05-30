import { useState } from 'react'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import AdminNavbar from '@/components/AdminNavbar'
import AddCategoryModal from '@/components/AddCategoryModal'
import AdminListPanel from '@/components/AdminListPanel'
import SearchForm from '@/components/SearchForm'
import './PagesStyles.css'
import useCategoryManager from '@/hooks/useCategoryManager'
import {
  loadProductTypes as loadProductTypesController,
  createProductType as createProductTypeController,
  deleteProductType as deleteProductTypeController,
} from '@/services/productTypeService'

export default function ProductTypesPage({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  onToggleNotifications,
  isNotificationsOpen,
  userRole,
  userName,
  userPosition,
  setProfileTargetTab,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, reload, createItem, deleteItem, error } = useCategoryManager({
    loadFn: loadProductTypesController,
    createFn: createProductTypeController,
    deleteFn: deleteProductTypeController,
  })

  const filtered = items.filter((productType) => (productType.product_type_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))

  const openCategoryModal = () => {
    setFormError('')
    setFormMessage('')
    setCategoryInput('')
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
  }

  const handleSubmitCategory = async (event) => {
    event.preventDefault()
    const nextValue = categoryInput.trim()
    if (!nextValue) {
      setFormError('Please enter a name.')
      return
    }
    try {
      setFormError('')
      await createItem(nextValue)
      setFormMessage(`Added product type ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteProductType = async (productType) => {
    const confirmed = window.confirm(`Delete product type "${productType.product_type_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(productType.id)
      setFormMessage(`Deleted product type ${productType.product_type_name} successfully.`)
    } catch (err) {
      setFormError(err.message)
    }
  }

  return (
    <div className="page-root">
      <Navbar
        activePage={activePage}
        onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={onToggleMenu}
        onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={onToggleNotifications}
        userRole={userRole}
        userName={userName}
        userPosition={userPosition}
        setProfileTargetTab={setProfileTargetTab}
      />

      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Manage Product Types</h1>

          <SettingsNavbar userRole={userRole} activePage={activePage} onNavigate={onPageChange} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar
                      activeTab={activePage === 'Roles' ? 'Roles' : activePage === 'Departments' ? 'Dept' : activePage === 'Locations' ? 'Locations' : activePage === 'Product Types' ? 'Product Types' : activePage === 'ISO Standards' ? 'ISO Standards' : 'Users'}
                      onTabChange={(tab) => {
                        const map = {
                          Users: 'Admin Panel',
                          Dept: 'Departments',
                          Roles: 'Roles',
                          Locations: 'Locations',
                          'Product Types': 'Product Types',
                          'ISO Standards': 'ISO Standards',
                        }
                        onPageChange?.(map[tab] || 'Admin Panel')
                      }}
                    />
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
                  <AdminListPanel
                    title="Available Product Types"
                    items={filtered}
                    loading={loading}
                    labelKey="product_type_name"
                    onDelete={handleDeleteProductType}
                    deletingId={deletingId}
                    noMatchesText="No matches found."
                  />
                  {error ? <p className="glass-card-subtext">{error}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <AddCategoryModal
            isOpen={isCategoryModalOpen}
            onClose={closeCategoryModal}
            onSubmit={handleSubmitCategory}
            title={'Create New Product Type'}
            label={'Product Type Name'}
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder={'Enter product type name'}
            loading={false}
            error={formError}
            message={formMessage}
            submitLabel={'Create Product Type'}
            helperText={'Create a product type entry that will be available in the NCR report modal.'}
          />
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
