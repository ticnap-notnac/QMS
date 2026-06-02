import { useState } from 'react'

import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import AddCategoryModal from '@/components/Modals/AddCategoryModal'
import AdminListPanel from '@/components/Panels/AdminListPanel'
import SearchForm from '@/components/Forms/SearchForm'
import './PagesStyles.css'
import useCategoryManager from '@/hooks/useCategoryManager'
import {
  loadLocations as loadLocationsController,
  createLocation as createLocationController,
  deleteLocation as deleteLocationController,
} from '@/services/locationService'

export default function LocationsPage({
  userRole,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, reload, createItem, deleteItem, error } = useCategoryManager({
    loadFn: loadLocationsController,
    createFn: createLocationController,
    deleteFn: deleteLocationController,
  })

  const filtered = items.filter((location) => (location.location_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))

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
      setFormMessage(`Added location ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteLocation = async (location) => {
    const confirmed = window.confirm(`Delete location "${location.location_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(location.id)
      setFormMessage(`Deleted location ${location.location_name} successfully.`)
    } catch (err) {
      setFormError(err.message)
    }
  }

  return (
    <div className="page-root">


      {userRole === 'admin' ? (
        <main className="page-main-wide">
          <h1 className="page-title">Manage Locations</h1>

          <SettingsNavbar userRole={userRole} />

          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel">
              <div className="search-row">
                <div className="admin-top-row">
                  <div className="admin-tabs-wrap">
                    <AdminNavbar activeTab="Locations" />
                  </div>
                </div>

                <div className="admin-search-actions-row">
                  <div className="admin-search-container">
                    <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={reload} placeholder="Search locations..." />
                  </div>
                  <div className="admin-actions-right">
                    <button onClick={openCategoryModal} className="btn-add-action">+ Add Location</button>
                  </div>
                </div>
              </div>

              <div className="glass-card-content">
                <div className="panel-narrow">
                  <p className="glass-card-subtext">Use the add button above to create a new location.</p>
                  <AdminListPanel
                    title="Available Locations"
                    items={filtered}
                    loading={loading}
                    labelKey="location_name"
                    onDelete={handleDeleteLocation}
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
            title={'Create New Location'}
            label={'Location Name'}
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder={'Enter location name'}
            loading={false}
            error={formError}
            message={formMessage}
            submitLabel={'Create Location'}
            helperText={'Create a location entry that will be available in the NCR report modal.'}
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
