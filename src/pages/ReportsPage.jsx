import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { 
  Upload as UploadIcon, 
  X as CloseIcon, 
  SlidersHorizontal,
  SquarePen,
  User,
  Calendar,
  Filter,
  FileSearch
} from 'lucide-react'
import './PagesStyles.css'
import { useAuth } from '@/hooks/useAuth'
import { loadDepartments } from '@/services/departmentService'
import { createReport, fetchReports, updateReport } from '@/services/ncrService'
import { fetchLocations, createLocation } from '@/services/locationService'
import { fetchProductTypes, createProductType } from '@/services/productTypeService'

const DEFAULT_CREATE_FORM = {
  productType: '',
  batchNumber: '',
  location: '',
  severity: '',
  department: '',
  description: '',
  investigationText: '',
  resolutionTime: '24h',
  verificationDate: '',
  preventiveRating: 'Excellent',
}

function formatDate(value) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getStatusStyle(status) {
  if (String(status).toLowerCase() === 'closed') {
    return { background: 'rgba(148, 163, 184, 0.18)', color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.3)' }
  }

  return { background: 'rgba(34, 197, 94, 0.16)', color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.28)' }
}

function getSeverityStyle(severity) {
  const value = String(severity).toLowerCase()
  if (value === 'high') {
    return { background: 'rgba(239, 68, 68, 0.18)', color: '#fecaca', borderColor: 'rgba(239, 68, 68, 0.32)' }
  }
  if (value === 'medium') {
    return { background: 'rgba(245, 158, 11, 0.18)', color: '#fde68a', borderColor: 'rgba(245, 158, 11, 0.32)' }
  }

  return { background: 'rgba(59, 130, 246, 0.18)', color: '#bfdbfe', borderColor: 'rgba(59, 130, 246, 0.32)' }
}

function SearchableDropdown({ label, value, onValueChange, options, loading, placeholder, onSelectOption }) {
  const [isOpen, setIsOpen] = useState(false)

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return options
    return options.filter((option) => String(option.label || '').toLowerCase().includes(query))
  }, [options, value])

  return (
    <div>
      <label className="label-field">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          className="input-field"
          placeholder={placeholder}
        />

        {isOpen ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              zIndex: 20,
              marginTop: '6px',
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid rgba(148, 163, 184, 0.28)',
              borderRadius: '12px',
              background: 'rgba(11, 24, 53, 0.98)',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)',
            }}
          >
            {loading ? (
              <div style={{ padding: '12px 14px', color: '#cbd5e1' }}>Loading...</div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onValueChange(option.label)
                    onSelectOption(option)
                    setIsOpen(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: 'transparent',
                    color: '#e2e8f0',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                No matches found. You can keep typing a custom value.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function toOptionList(items, labelKey) {
  return (items || []).map((item) => ({
    id: item.id,
    label: item[labelKey] || '',
  }))
}

function ReportsPage({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  userRole,
  userName,
  userPosition,
  setIsAdminPanelOpen,
  setIsAuditToolsOpen,
  setProfileTargetTab,
  authUserId,
}) {
  const { user: authUser } = useAuth()
  const currentAuthId = authUser?.id || authUserId || ''

  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [carFiled, setCarFiled] = useState(false)
  const [qddrFiled, setQddrFiled] = useState(false)
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [productTypesLoading, setProductTypesLoading] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isCarModalOpen, setIsCarModalOpen] = useState(false)
  const [isQddrModalOpen, setIsQddrModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isPreventiveActionModalOpen, setIsPreventiveActionModalOpen] = useState(false)

  const [productType, setProductType] = useState(DEFAULT_CREATE_FORM.productType)
  const [productTypeId, setProductTypeId] = useState('')
  const [batchNumber, setBatchNumber] = useState(DEFAULT_CREATE_FORM.batchNumber)
  const [location, setLocation] = useState(DEFAULT_CREATE_FORM.location)
  const [locationId, setLocationId] = useState('')
  const [severity, setSeverity] = useState(DEFAULT_CREATE_FORM.severity)
  const [department, setDepartment] = useState(DEFAULT_CREATE_FORM.department)
  const [description, setDescription] = useState(DEFAULT_CREATE_FORM.description)
  const [investigationText, setInvestigationText] = useState(DEFAULT_CREATE_FORM.investigationText)
  const [resolutionTime, setResolutionTime] = useState(DEFAULT_CREATE_FORM.resolutionTime)
  const [verificationDate, setVerificationDate] = useState(DEFAULT_CREATE_FORM.verificationDate)
  const [preventiveRating, setPreventiveRating] = useState(DEFAULT_CREATE_FORM.preventiveRating)

  const departmentOptions = useMemo(() => departments || [], [departments])
  const locationOptions = useMemo(() => toOptionList(locations, 'location_name'), [locations])
  const productTypeOptions = useMemo(() => toOptionList(productTypes, 'product_type_name'), [productTypes])

  const resetCreateForm = () => {
    setProductType(DEFAULT_CREATE_FORM.productType)
    setProductTypeId('')
    setBatchNumber(DEFAULT_CREATE_FORM.batchNumber)
    setLocation(DEFAULT_CREATE_FORM.location)
    setLocationId('')
    setSeverity(DEFAULT_CREATE_FORM.severity)
    setDepartment(DEFAULT_CREATE_FORM.department)
    setDescription(DEFAULT_CREATE_FORM.description)
    setCarFiled(false)
    setQddrFiled(false)
  }

  const setFormFromReport = (report) => {
    if (!report) return

    setProductType(report.product_type_name || report.product_type || '')
    setProductTypeId(report.product_type_id ? String(report.product_type_id) : '')
    setBatchNumber(report.batch_number || '')
    setLocation(report.location_name || report.complaint_location || '')
    setLocationId(report.location_id ? String(report.location_id) : '')
    setSeverity(report.severity || '')
    setDepartment(report.department_id ? String(report.department_id) : '')
    setDescription(report.description || '')
    setInvestigationText(report.investigation_text || '')
    setResolutionTime(report.resolution_time || DEFAULT_CREATE_FORM.resolutionTime)
    setVerificationDate(report.verification_date || '')
    setPreventiveRating(report.preventive_rating || DEFAULT_CREATE_FORM.preventiveRating)
    setCarFiled(Boolean(report.car_filed))
    setQddrFiled(Boolean(report.qddr_filed))
  }

  const loadPageData = async () => {
    setIsLoading(true)
    setDepartmentsLoading(true)
    setLocationsLoading(true)
    setProductTypesLoading(true)
    setError(null)

    try {
      const [departmentData, locationData, productTypeData, reportData] = await Promise.all([
        loadDepartments(),
        fetchLocations(),
        fetchProductTypes(),
        fetchReports(),
      ])

      setDepartments(Array.isArray(departmentData) ? departmentData : [])
      setLocations(Array.isArray(locationData) ? locationData : [])
      setProductTypes(Array.isArray(productTypeData) ? productTypeData : [])
      setReports(Array.isArray(reportData) ? reportData : [])
    } catch (err) {
      setError(err?.message || 'Failed to load NCR reports.')
    } finally {
      setIsLoading(false)
      setDepartmentsLoading(false)
      setLocationsLoading(false)
      setProductTypesLoading(false)
    }
  }

  useEffect(() => {
    loadPageData()
  }, [currentAuthId])

  const openCreateModal = () => {
    setError(null)
    resetCreateForm()
    setIsModalOpen(true)
  }

  const closeCreateModal = () => {
    setIsModalOpen(false)
  }

  const openCarModal = () => {
    setCarFiled(true)
    setIsModalOpen(false)
    setIsCarModalOpen(true)
  }

  const closeCarModal = () => {
    setIsCarModalOpen(false)
    setIsModalOpen(true)
  }

  const openQddrModal = () => {
    setQddrFiled(true)
    setIsModalOpen(false)
    setIsQddrModalOpen(true)
  }

  const closeQddrModal = () => {
    setIsQddrModalOpen(false)
    setIsModalOpen(true)
  }

  const openUpdateModal = (report) => {
    setSelectedReport(report)
    setError(null)
    setFormFromReport(report)
    setIsUpdateModalOpen(true)
  }

  const closeUpdateModal = () => {
    setIsUpdateModalOpen(false)
    setSelectedReport(null)
  }

  const triggerPreventiveActionTransition = () => {
    setIsUpdateModalOpen(false)
    setIsPreventiveActionModalOpen(true)
  }

  const resolveCatalogSelection = async ({ inputValue, selectedId, options, createFn, optionLabelKey }) => {
    const trimmed = String(inputValue || '').trim()
    if (!trimmed) {
      throw new Error('Location and product type are required.')
    }

    if (selectedId) {
      const existingById = options.find((option) => String(option.id) === String(selectedId))
      if (existingById) {
        return { id: existingById.id, label: existingById[optionLabelKey] || existingById.label || trimmed }
      }
    }

    const exactMatch = options.find((option) => String(option[optionLabelKey] || option.label || '').trim().toLowerCase() === trimmed.toLowerCase())
    if (exactMatch) {
      return { id: exactMatch.id, label: exactMatch[optionLabelKey] || exactMatch.label || trimmed }
    }

    const created = await createFn(trimmed)
    const createdItem = Array.isArray(created) ? created[0] : created
    return {
      id: createdItem?.id,
      label: createdItem?.[optionLabelKey] || createdItem?.label || trimmed,
    }
  }

  const handleSubmitReport = async (event) => {
    event.preventDefault()
    await submitReport()
  }

  // Shared create flow used by the main create form and CAR/QDDR modals
  const submitReport = async (overrides = {}) => {
    try {
      setError(null)

      const resolvedProductType = await resolveCatalogSelection({
        inputValue: productType,
        selectedId: productTypeId,
        options: productTypeOptions,
        createFn: createProductType,
        optionLabelKey: 'label',
      })

      const resolvedLocation = await resolveCatalogSelection({
        inputValue: location,
        selectedId: locationId,
        options: locationOptions,
        createFn: createLocation,
        optionLabelKey: 'label',
      })

      const payload = {
        product_type_id: resolvedProductType.id,
        batch_number: batchNumber,
        location_id: resolvedLocation.id,
        severity,
        department_id: department,
        description,
        car_filed: Boolean(carFiled),
        qddr_filed: Boolean(qddrFiled),
        evidence_url: null,
        ...overrides,
      }

      await createReport(payload)

      // close any open creation-related modals
      setIsCarModalOpen(false)
      setIsQddrModalOpen(false)
      setIsModalOpen(false)

      resetCreateForm()
      await loadPageData()
    } catch (err) {
      setError(err?.message || 'Failed to submit NCR report.')
      throw err
    }
  }

  const handleUpdateReport = async (event) => {
    event.preventDefault()
    if (!selectedReport?.id) return

    try {
      setError(null)
      const resolvedProductType = await resolveCatalogSelection({
        inputValue: productType,
        selectedId: productTypeId,
        options: productTypeOptions,
        createFn: createProductType,
        optionLabelKey: 'label',
      })

      const resolvedLocation = await resolveCatalogSelection({
        inputValue: location,
        selectedId: locationId,
        options: locationOptions,
        createFn: createLocation,
        optionLabelKey: 'label',
      })

      await updateReport(selectedReport.id, {
        product_type_id: resolvedProductType.id,
        batch_number: batchNumber,
        location_id: resolvedLocation.id,
        severity,
        department_id: department,
        description,
        car_filed: carFiled,
        qddr_filed: qddrFiled,
        evidence_url: selectedReport.evidence_url ?? null,
      })
      closeUpdateModal()
      await loadPageData()
    } catch (err) {
      setError(err?.message || 'Failed to update NCR report.')
    }
  }

  const departmentNameById = useMemo(() => {
    return new Map((departments || []).map((item) => [String(item.id), item.department_name]))
  }, [departments])

  return (
    <main className="dashboard page-root">
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
        setIsAdminPanelOpen={setIsAdminPanelOpen}
        setIsAuditToolsOpen={setIsAuditToolsOpen}
        setProfileTargetTab={setProfileTargetTab}
      />

      <div className="reports-main-wrap">
        <div className="flex-start-row">
          <button type="button" onClick={() => setIsFilterModalOpen(true)} className="btn-glass-action">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {error ? <div className="user-info-error">{error}</div> : null}

        {isLoading ? (
          <div className="reports-card">
            <div className="glass-card-subtext">Loading reports...</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="reports-card">
            <div className="reports-workspace">
              <span className="reports-workspace-text">No reports yet</span>
            </div>
          </div>
        ) : (
          reports.map((report) => {
            const reporterName = report.reporter_full_name || 'Name of the User'
            const reporterRole = report.reporter_role_name || 'Position'
            const reporterDepartment = report.reporter_department_name || departmentNameById.get(String(report.department_id)) || 'Department'
            const reportLocation = report.location_name || report.complaint_location || 'Location'
            const statusStyle = getStatusStyle(report.status)
            const severityStyle = getSeverityStyle(report.severity)

            return (
              <div className="reports-card" key={report.id}>
                <div className="reports-card-header">
                  <div className="reports-user-block">
                    <div className="reports-avatar">
                      <User size={20} className="icon-cyan" />
                    </div>
                    <div className="reports-user-text">
                      <span className="reports-user-name">{reporterName}</span>
                      <span className="reports-user-meta">
                        {reporterRole} • {reporterDepartment} • {reportLocation} • {formatDate(report.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="badges-row">
                    <span className="status-badge" style={statusStyle}>{String(report.status || 'open').toUpperCase()}</span>
                    <span className="day-badge" style={severityStyle}>{String(report.severity || 'low').toUpperCase()}</span>
                  </div>
                </div>
                <div className="reports-details-title-wrap"><h4 className="reports-details-title">Details</h4></div>

                <div className="reports-workspace">
                  <span className="reports-workspace-text">{report.description || 'No description provided.'}</span>
                  <div onClick={() => openUpdateModal(report)} className="edit-icon-container"><SquarePen size={18} /></div>
                </div>
              </div>
            )
          })
        )}

        <div className="reports-submit-row">
          <button type="button" onClick={openCreateModal} className="btn-gradient-primary reports-submit-primary">Submit a Report</button>
        </div>
      </div>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--large">
            <button onClick={() => setIsFilterModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <div className="modal-header-row">
              <Filter size={20} className="icon-teal" />
              <h3 className="modal-title-lg">Filter Reports</h3>
            </div>
            <div className="modal-grid">
              <div className="modal-col">
                <div className="modal-grid-2">
                  <div>
                    <label className="label-field">Department</label>
                    <select className="input-field" defaultValue="">
                      <option value="">Select</option>
                      {departmentOptions.map((item) => (
                        <option key={item.id} value={item.id}>{item.department_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Date</label>
                    <div className="relative">
                      <input type="text" placeholder="DD-MM/YYYY" className="input-field" />
                      <Calendar size={14} className="icon-abs" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label-field">Status</label>
                  <div className="filter-options-row"><button className="filter-option-button">OPEN</button><button className="filter-option-button">CLOSED</button></div>
                </div>
                <div>
                  <label className="label-field">Severity Level</label>
                  <div className="filter-options-row wrap"><button className="filter-option-button">CRITICAL</button><button className="filter-option-button">MAJOR DEFECTS</button><button className="filter-option-button">MINOR DEFECTS</button></div>
                </div>
              </div>
              <div className="modal-col">
                <div className="filter-options-row"><button className="filter-option-button">QDDR</button><button className="filter-option-button">CAR</button></div>
                <div><label className="label-field">Product Type</label><input type="text" className="input-field" /></div>
                <div><label className="label-field">Cause</label><input type="text" className="input-field" /></div>
              </div>
            </div>
            <div className="modal-actions-center"><button onClick={() => setIsFilterModalOpen(false)} className="btn-gradient-primary">Filter Report</button></div>
          </div>
        </div>
      )}

      {/* Main Creation Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button onClick={closeCreateModal} className="modal-close-button"><CloseIcon size={18} /></button>
            <form onSubmit={handleSubmitReport} className="modal-form">
              <div>
                <label className="label-field">Evidence:</label>
                <div className="upload-box"><UploadIcon size={20} className="icon-teal" /><span className="reports-upload-text">Upload an Image</span></div>
              </div>
              <div className="reports-grid-3-16">
                <div>
                  <SearchableDropdown
                    label="Product Type:"
                    value={productType}
                    onValueChange={(nextValue) => {
                      setProductType(nextValue)
                      setProductTypeId('')
                    }}
                    options={productTypeOptions}
                    loading={productTypesLoading}
                    placeholder={productTypesLoading ? 'Loading product types...' : 'Enter or select product type'}
                    onSelectOption={(option) => setProductTypeId(String(option.id))}
                  />
                </div>
                <div><label className="label-field">Batch Number:</label><input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="input-field" placeholder="Enter batch number" /></div>
                <div>
                  <SearchableDropdown
                    label="Location:"
                    value={location}
                    onValueChange={(nextValue) => {
                      setLocation(nextValue)
                      setLocationId('')
                    }}
                    options={locationOptions}
                    loading={locationsLoading}
                    placeholder={locationsLoading ? 'Loading locations...' : 'Enter or select location'}
                    onSelectOption={(option) => setLocationId(String(option.id))}
                  />
                </div>
              </div>
              <div className="reports-grid-2-16">
                <div>
                  <label className="label-field">Severity Level:</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="select-field">
                    <option value="" disabled hidden>Select evaluation risk</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Severity</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Department:</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="select-field" disabled={departmentsLoading || departmentOptions.length === 0}>
                    <option value="" disabled hidden>{departmentsLoading ? 'Loading departments...' : 'Select targeted module block'}</option>
                    {departmentOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.department_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div><label className="label-field">Description:</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field textarea-large" placeholder="Provide thorough configuration summary report details..." /></div>
              <div className="modal-badges-row">
                <button type="button" onClick={openCarModal} className="badge-button">File for CAR</button>
                <button type="button" onClick={openQddrModal} className="badge-button">File for QDDR</button>
              </div>
              <div className="modal-submit-row"><button type="submit" className="btn-gradient-primary">Submit Report</button></div>
            </form>
          </div>
        </div>
      )}

      {/* CAR Modal */}
      {isCarModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--large">
            <button onClick={closeCarModal} className="modal-close-button"><CloseIcon size={18} /></button>
            <h3 className="reports-uppercase-title">Corrective Action Report</h3>
            <div className="workspace-placeholder"><span className="reports-placeholder-text">Corrective Actions Configuration Sheet</span><div className="cross-line-bg"></div></div>
            <div className="center-row"><button type="button" onClick={async () => { try { await submitReport({ car_filed: true }) } catch (e) {} }} className="secondary-action-button">Submit Report</button></div>
          </div>
        </div>
      )}

      {/* QDDR Modal */}
      {isQddrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--large">
            <button onClick={closeQddrModal} className="modal-close-button"><CloseIcon size={18} /></button>
            <h3 className="reports-uppercase-title">Quality Defects / Damaged / Discrepancy Report</h3>
            <div className="workspace-placeholder"><span className="reports-placeholder-text">Quality Discrepancy Analysis Canvas</span><div className="cross-line-bg"></div></div>
            <div className="center-row"><button type="button" onClick={async () => { try { await submitReport({ qddr_filed: true }) } catch (e) {} }} className="secondary-action-button">Submit Report</button></div>
          </div>
        </div>
      )}

      {/* Update Report Modal */}
      {isUpdateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--tall reports-update-card">
            <button onClick={closeUpdateModal} className="modal-close-button"><CloseIcon size={18} /></button>
            <div className="modal-header-row">
              <FileSearch size={18} className="icon-teal" />
              <h3 className="reports-update-title">Update Report</h3>
            </div>
            <form onSubmit={handleUpdateReport} className="modal-form reports-form-compact">
              <div>
                <label className="label-field">Evidence:</label>
                <div className="upload-box upload-box--padded"><UploadIcon size={18} className="icon-teal" /><span className="reports-upload-text-small">Upload an Image</span></div>
              </div>
              <div className="grid-3">
                <div>
                  <SearchableDropdown
                    label="Product Type:"
                    value={productType}
                    onValueChange={(nextValue) => {
                      setProductType(nextValue)
                      setProductTypeId('')
                    }}
                    options={productTypeOptions}
                    loading={productTypesLoading}
                    placeholder={productTypesLoading ? 'Loading product types...' : 'Enter or select product type'}
                    onSelectOption={(option) => setProductTypeId(String(option.id))}
                  />
                </div>
                <div><label className="label-field">Batch Number:</label><input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="input-field" /></div>
                <div>
                  <SearchableDropdown
                    label="Location:"
                    value={location}
                    onValueChange={(nextValue) => {
                      setLocation(nextValue)
                      setLocationId('')
                    }}
                    options={locationOptions}
                    loading={locationsLoading}
                    placeholder={locationsLoading ? 'Loading locations...' : 'Enter or select location'}
                    onSelectOption={(option) => setLocationId(String(option.id))}
                  />
                </div>
              </div>
              <div className="reports-grid-2-14">
                <div>
                  <label className="label-field">Severity Level:</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="select-field">
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Severity</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Department:</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="select-field" disabled={departmentsLoading || departmentOptions.length === 0}>
                    {departmentOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.department_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div><label className="label-field">Description:</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field textarea-medium" /></div>
              <div><label className="label-field">Investigation:</label><textarea value={investigationText} onChange={(e) => setInvestigationText(e.target.value)} className="input-field textarea-medium" /></div>
              <div className="modal-grid-2">
                <div>
                  <label className="label-field">Resolution Time:</label>
                  <select value={resolutionTime} onChange={(e) => setResolutionTime(e.target.value)} className="select-field">
                    <option value="24h">Within 24 Hours</option>
                    <option value="72h">Within 3 Days</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Verification Date:</label>
                  <div className="relative">
                    <input type="text" value={verificationDate} onChange={(e) => setVerificationDate(e.target.value)} placeholder="DD/MM/YYYY" className="input-field" />
                    <Calendar size={14} className="icon-abs" />
                  </div>
                </div>
              </div>
              <div className="reports-update-submit-row">
                <button type="submit" className="btn-gradient-primary reports-update-button">Update Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preventive Action Modal */}
      {isPreventiveActionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card reports-preventive-card">
            <button onClick={() => setIsPreventiveActionModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <div className="modal-body-col">
              <div>
                <label className="label-field">Suggested Preventive Action:</label>
                <div className="workspace-placeholder workspace-placeholder--small">
                  <span className="reports-upload-text-small">Preventive Directives Content Sheet Panel</span>
                  <div className="cross-line-bg"></div>
                </div>
              </div>
              <div className="preventive-panel">
                <span className="label-field label-field--small">Suggested Preventive Action Rating:</span>
                <div className="preventive-options">
                  {['Excellent', 'Good', 'Ok', 'Poor', 'Very Poor'].map((rating) => (
                    <label key={rating} className="preventive-option">
                      <input type="radio" name="preventiveRating" value={rating} checked={preventiveRating === rating} onChange={(e) => setPreventiveRating(e.target.value)} className="radio-accent" />
                      {rating}
                    </label>
                  ))}
                </div>
              </div>
              <div className="reports-preventive-submit-row">
                <button type="button" onClick={() => setIsPreventiveActionModalOpen(false)} className="reports-secondary-muted">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default ReportsPage
