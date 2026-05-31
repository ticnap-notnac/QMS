import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { 
  Upload as UploadIcon, 
  X as CloseIcon, 
  SlidersHorizontal,
  SquarePen,
  User,
} from 'lucide-react'
import './PagesStyles.css' // 📁 Central stylesheet used by pages
import { useAuth } from '@/hooks/useAuth'
import { loadDepartments } from '@/services/departmentService'
import Toast from '@/components/Toast'
import { createReport, fetchInvestigatedReports, fetchReports, submitNcrMultipart } from '@/services/ncrService'
import FilterModal from '../components/Modals/FilterModal.jsx'
import UpdateReportModal from '../components/Modals/UpdateReportModal.jsx'
import AssignReportModal from '../components/Modals/AssignReportModal.jsx'
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

function normalizeSeverity(value) {
  return String(value || 'low').trim().toLowerCase()
}

function applyReportFilters(reportList, filters) {
  const selectedSeverities = Array.isArray(filters?.severities)
    ? filters.severities.map((severityValue) => String(severityValue || '').trim().toLowerCase()).filter(Boolean)
    : []

  return (reportList || []).filter((report) => {
    if (filters?.departmentId && String(report.department_id || '') !== String(filters.departmentId)) {
      return false
    }

    if (filters?.status && String(report.status || '').trim().toLowerCase() !== String(filters.status).trim().toLowerCase()) {
      return false
    }

    if (selectedSeverities.length > 0) {
      const reportSeverity = normalizeSeverity(report.severity)
      if (!selectedSeverities.includes(reportSeverity)) {
        return false
      }
    }

    if (filters?.date && String(report.occurrence_date || '') !== String(filters.date)) {
      return false
    }

    return true
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
  const [investigatedReports, setInvestigatedReports] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedAssignmentReport, setSelectedAssignmentReport] = useState(null)
  const [reportFilters, setReportFilters] = useState({
    departmentId: '',
    status: '',
    severities: [],
    date: '',
  })
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [productTypesLoading, setProductTypesLoading] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
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
  const fileInputRefMain = useRef(null)
  const [evidenceFileMain, setEvidenceFileMain] = useState(null)
  const [evidencePreviewMain, setEvidencePreviewMain] = useState(null)
  const [evidenceErrorMain, setEvidenceErrorMain] = useState(null)

  const departmentOptions = useMemo(() => departments || [], [departments])
  const locationOptions = useMemo(() => toOptionList(locations, 'location_name'), [locations])
  const productTypeOptions = useMemo(() => toOptionList(productTypes, 'product_type_name'), [productTypes])
  const canAssignReports = ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase())

  const resetCreateForm = () => {
    setProductType(DEFAULT_CREATE_FORM.productType)
    setProductTypeId('')
    setBatchNumber(DEFAULT_CREATE_FORM.batchNumber)
    setLocation(DEFAULT_CREATE_FORM.location)
    setLocationId('')
    setSeverity(DEFAULT_CREATE_FORM.severity)
    setDepartment(DEFAULT_CREATE_FORM.department)
    setDescription(DEFAULT_CREATE_FORM.description)
  }

  const refreshReportsList = useCallback(async (filters = reportFilters) => {
    setIsLoading(true)
    setError(null)

    try {
      const [openReportsData, investigatedReportsData] = await Promise.all([
        fetchReports(),
        fetchInvestigatedReports(),
      ])

      const openReports = Array.isArray(openReportsData) ? openReportsData : []
      const resolvedReports = Array.isArray(investigatedReportsData) ? investigatedReportsData : []

      setReports(applyReportFilters(openReports, filters))
      setInvestigatedReports(applyReportFilters(resolvedReports, filters))
    } catch (err) {
      setError(err?.message || 'Failed to load NCR reports.')
    } finally {
      setIsLoading(false)
    }
  }, [reportFilters])

  const loadLookupData = useCallback(async () => {
    setDepartmentsLoading(true)
    setLocationsLoading(true)
    setProductTypesLoading(true)

    try {
      const [departmentData, locationData, productTypeData] = await Promise.all([
        loadDepartments(),
        fetchLocations(),
        fetchProductTypes(),
      ])

      setDepartments(Array.isArray(departmentData) ? departmentData : [])
      setLocations(Array.isArray(locationData) ? locationData : [])
      setProductTypes(Array.isArray(productTypeData) ? productTypeData : [])
    } catch (err) {
      setError(err?.message || 'Failed to load NCR reference data.')
    } finally {
      setDepartmentsLoading(false)
      setLocationsLoading(false)
      setProductTypesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLookupData()
    refreshReportsList()
  }, [currentAuthId, loadLookupData, refreshReportsList])

  const openCreateModal = () => {
    setError(null)
    resetCreateForm()
    setIsModalOpen(true)
  }

  const closeCreateModal = () => {
    setIsModalOpen(false)
    if (evidencePreviewMain) {
      try { URL.revokeObjectURL(evidencePreviewMain) } catch (e) {}
    }
    setEvidenceFileMain(null)
    setEvidencePreviewMain(null)
    setEvidenceErrorMain(null)
  }

  const openUpdateModal = (report) => {
    setSelectedReport(report)
    setIsUpdateModalOpen(true)
  }

  const openAssignModal = (report) => {
    setSelectedAssignmentReport(report)
    setIsAssignModalOpen(true)
  }

  const closeUpdateModal = () => {
    setIsUpdateModalOpen(false)
    setSelectedReport(null)
  }

  const closeAssignModal = () => {
    setIsAssignModalOpen(false)
    setSelectedAssignmentReport(null)
  }

  const handleFilterApply = async (filters) => {
    setReportFilters(filters)
    await refreshReportsList(filters)
  }

  const handleFilterClear = async () => {
    const clearedFilters = {
      departmentId: '',
      status: '',
      severities: [],
      date: '',
    }

    setReportFilters(clearedFilters)
    await refreshReportsList(clearedFilters)
  }

  const handleUpdateSuccess = async () => {
    setToast({ message: 'Report updated successfully', type: 'success' })
    closeUpdateModal()
    await refreshReportsList()
  }

  const handleAssignSuccess = async ({ selectedUser }) => {
    const assignedName = selectedUser?.user_name || 'employee'
    const referenceNo = selectedAssignmentReport?.reference_no || 'report'
    setToast({ message: `Report ${referenceNo} assigned to ${assignedName}`, type: 'success' })
    closeAssignModal()
    await refreshReportsList()
  }

  const handleSubmitReport = async (event) => {
    event.preventDefault()
    await submitReport()
  }

  const submitReport = async (overrides = {}) => {
    try {
      setError(null)

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

      if (evidenceFileMain) {
        if (!currentAuthId) {
          throw new Error('Missing authenticated user. Please log in again.')
        }
        const fd = new FormData()
        fd.append('product_type_id', resolvedProductType.id)
        fd.append('batch_number', batchNumber)
        fd.append('location_id', resolvedLocation.id)
        fd.append('severity', severity)
        fd.append('department_id', department)
        fd.append('description', description)
        fd.append('car_filed', 'false')
        fd.append('qddr_filed', 'false')
        fd.append('evidence', evidenceFileMain)
        await submitNcrMultipart(fd, currentAuthId)
      } else {
        const payload = {
          product_type_id: resolvedProductType.id,
          batch_number: batchNumber,
          location_id: resolvedLocation.id,
          severity,
          department_id: department,
          description,
          car_filed: false,
          qddr_filed: false,
          evidence_url: null,
          ...overrides,
        }

        await createReport(payload)
      }

      setIsModalOpen(false)
      if (evidencePreviewMain) {
        try { URL.revokeObjectURL(evidencePreviewMain) } catch (e) {}
      }
      setEvidenceFileMain(null)
      setEvidencePreviewMain(null)
      setEvidenceErrorMain(null)

      resetCreateForm()
      await loadLookupData()
      await refreshReportsList()
    } catch (err) {
      setError(err?.message || 'Failed to submit NCR report.')
      throw err
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

      {toast ? (
        <div style={{ position: 'fixed', right: '24px', top: '88px', zIndex: 50 }}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      ) : null}

      <div className="reports-main-wrap">
        {/* 🎯 UPDATED: Symmetrical header with an actionable left button group and a single right button */}
        <div className="reports-action-header-row">
          {/* Left-aligned controls block group */}
          <div className="reports-header-controls-left">
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="btn-glass-action"
              title="Open Filters"
            >
              <SlidersHorizontal size={18} />
            </button>

            <button
              type="button"
              className="btn-quick-toggle"
              onClick={() => console.log('Toggle CAR filter')}
            >
              CAR
            </button>

            <button
              type="button"
              className="btn-quick-toggle"
              onClick={() => console.log('Toggle QDDR filter')}
            >
              QDDR
            </button>
          </div>

          {/* Far-right submission action point */}
          <button type="button" onClick={openCreateModal} className="btn-gradient-primary reports-submit-primary">
            Submit a Report
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
              <div className="reports-card" key={report.id} id={`report-card-${report.id}`}>
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

                <div className="reports-details-box">
                  <span className="reports-workspace-text">{report.description || 'No description provided.'}</span>
                  {/* 🎯 Pencil icon container pulled out clean and simple! */}
                </div>

                <div className="reports-details-title-wrap"><h4 className="reports-details-title">Evidence</h4></div>
                <div className="evidence-box">
                  {report.evidence_url ? (
                    <img
                      src={report.evidence_url}
                      alt="Evidence"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                      onClick={() => window.open(report.evidence_url, '_blank', 'noopener,noreferrer')}
                    />
                  ) : (
                    <p style={{ color: 'var(--muted)', textAlign: 'center' }}>
                      No evidence image attached
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  {canAssignReports ? (
                    <button
                      type="button"
                      className="btn-edit-user"
                      onClick={() => openAssignModal(report)}
                      title="Assign report"
                    >
                      Assign
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn-edit-user"
                    onClick={() => openUpdateModal(report)}
                    title="Update report"
                  >
                    <SquarePen size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {investigatedReports.length > 0 ? (
        <div className="reports-main-wrap" style={{ marginTop: '24px' }}>
          <div className="reports-details-title-wrap" style={{ marginBottom: '12px' }}>
            <h4 className="reports-details-title">Investigated Reports</h4>
          </div>

          <div className="reports-list-stack">
            {investigatedReports.map((report) => {
              const reporterName = report.reporter_full_name || 'Name of the User'
              const reporterRole = report.reporter_role_name || 'Position'
              const reporterDepartment = report.reporter_department_name || departmentNameById.get(String(report.department_id)) || 'Department'
              const reportLocation = report.location_name || report.complaint_location || 'Location'
              const statusStyle = getStatusStyle(report.status)
              const severityStyle = getSeverityStyle(report.severity)

              return (
                <div className="reports-card" key={`investigated-${report.id}`} id={`report-card-${report.id}`}>
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

                  <div className="reports-details-title-wrap"><h4 className="reports-details-title">Investigation Details</h4></div>
                  <div className="reports-details-box">
                    <span className="reports-workspace-text">{report.investigation_details || 'No investigation details provided.'}</span>
                  </div>

                  <div className="reports-details-title-wrap"><h4 className="reports-details-title">Resolution Details</h4></div>
                  <div className="reports-details-box">
                    <span className="reports-workspace-text">{report.resolution_details || 'No resolution details provided.'}</span>
                  </div>

                  <div className="reports-grid-2-16" style={{ marginTop: '12px' }}>
                    <div className="reports-details-box">
                      <span className="reports-workspace-text">Resolution Time: {report.resolution_time_value ? `${report.resolution_time_value} ${report.resolution_time_unit || ''}`.trim() : 'Not available'}</span>
                    </div>
                    <div className="reports-details-box">
                      <span className="reports-workspace-text">Verification Date: {formatDate(report.verification_date)}</span>
                    </div>
                  </div>

                  <div className="reports-details-title-wrap"><h4 className="reports-details-title">Investigation Evidence</h4></div>
                  <div className="evidence-box">
                    {report.investigation_evidence_url ? (
                      <img
                        src={report.investigation_evidence_url}
                        alt="Investigation evidence"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                        onClick={() => window.open(report.investigation_evidence_url, '_blank', 'noopener,noreferrer')}
                      />
                    ) : (
                      <p style={{ color: 'var(--muted)', textAlign: 'center' }}>
                        No investigation image attached
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    {canAssignReports ? (
                      <button
                        type="button"
                        className="btn-edit-user"
                        onClick={() => openAssignModal(report)}
                        title="Assign report"
                      >
                        Assign
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-edit-user"
                      onClick={() => openUpdateModal(report)}
                      title="Update report"
                    >
                      <SquarePen size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Main Creation Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button onClick={closeCreateModal} className="modal-close-button"><CloseIcon size={18} /></button>
            <form onSubmit={handleSubmitReport} className="modal-form">
              <div>
                <label className="label-field">Evidence:</label>
                <div
                  className="upload-box"
                  onClick={() => fileInputRefMain?.current && fileInputRefMain.current.click()}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  {!evidencePreviewMain ? (
                    <>
                      <UploadIcon size={20} className="icon-teal" />
                      <span className="reports-upload-text">Upload an Image</span>
                    </>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <img src={evidencePreviewMain} alt="Evidence preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
                      <button
                        type="button"
                        className="remove-preview-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          try { URL.revokeObjectURL(evidencePreviewMain) } catch (err) {}
                          setEvidenceFileMain(null)
                          setEvidencePreviewMain(null)
                          setEvidenceErrorMain(null)
                        }}
                        style={{ position: 'absolute', top: 8, right: 8 }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRefMain}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0]
                      if (!file) return
                      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
                      if (!allowed.includes(file.type)) {
                        setEvidenceErrorMain('Only jpg, jpeg, png, webp images are allowed')
                        return
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setEvidenceErrorMain('Image must be under 5MB')
                        return
                      }
                      if (evidencePreviewMain) {
                        try { URL.revokeObjectURL(evidencePreviewMain) } catch (err) {}
                      }
                      const url = URL.createObjectURL(file)
                      setEvidenceFileMain(file)
                      setEvidencePreviewMain(url)
                      setEvidenceErrorMain(null)
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
                {evidenceErrorMain && <div style={{ marginTop: 6, color: '#fca5a5', fontSize: 12 }}>{evidenceErrorMain}</div>}
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
              <div className="modal-submit-row"><button type="submit" className="btn-gradient-primary">Submit Report</button></div>
            </form>
          </div>
        </div>
      )}

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilters={handleFilterApply}
        onClearFilters={handleFilterClear}
      />

      <UpdateReportModal
        isOpen={isUpdateModalOpen}
        onClose={closeUpdateModal}
        report={selectedReport}
        onSuccess={handleUpdateSuccess}
      />

      <AssignReportModal
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        report={selectedAssignmentReport}
        onSuccess={handleAssignSuccess}
      />

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