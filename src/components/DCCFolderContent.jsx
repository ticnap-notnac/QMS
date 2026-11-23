import { useState, useRef, useEffect, useCallback } from 'react'
import { isAdminRole } from '../utils/roleUtils.js'
import { Folder, FileText, Search, ArrowLeft, AlertCircle, ChevronDown, ChevronRight, Download, Terminal, ShieldAlert, Share2, Settings, File, Eye, X, Calendar, SlidersHorizontal, Trash2, RotateCcw, RefreshCw } from 'lucide-react'
import SystemLogsPanel from './Panels/SystemLogsPanel.jsx'
import { supabase } from '../utils/supabase'
import html2pdf from 'html2pdf.js'
import CARPrintTemplate from './Print/CARPrintTemplate.jsx'
import NCRPrintTemplate from './Print/NCRPrintTemplate.jsx'
import QDDRPrintTemplate from './Print/QDDRPrintTemplate.jsx'
import DCCReportDetailsModal from './Modals/DCCReportDetailsModal.jsx'
import ConfirmDialog from './Modals/ConfirmDialog.jsx'
import Toast from './UI/Toast.jsx'
import { fetchProducts } from '../services/productService'
import { fetchProductTypes } from '../services/productTypeService'
import { fetchDeletedReports } from '../services/dccService'
import { restoreCarReport, permanentDeleteCarReport } from '../services/carService'
import { restoreQddrReport, permanentDeleteQddrReport } from '../services/qddrService'


const SEVERITY_COLORS = {
  Critical: 'severity-critical',
  High: 'severity-high',
  Medium: 'severity-medium',
  Low: 'severity-low',
}

const NCR_EVIDENCE_BUCKET = 'ncr-evidence'

function resolveStorageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const { data } = supabase.storage.from(NCR_EVIDENCE_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

/**
 * Groups an array of report objects by Creation/Occurrence Month and Year.
 * Returns an array of group objects sorted in reverse chronological order (newest month first).
 */
function groupReportsByMonthYear(reports, sortOrder = 'newest') {
  if (!reports || !reports.length) return []

  const groups = {}

  reports.forEach((item) => {
    const rawDate = item.occurrence_date || item.date || item.created_at || item.request_date || item.audit_date
    const d = rawDate ? new Date(rawDate) : new Date()
    const validDate = isNaN(d.getTime()) ? new Date() : d

    const year = validDate.getFullYear()
    const monthIndex = validDate.getMonth()
    const monthName = validDate.toLocaleString('default', { month: 'long' })
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`

    if (!groups[monthKey]) {
      groups[monthKey] = {
        key: monthKey,
        label,
        items: []
      }
    }
    groups[monthKey].items.push(item)
  })

  const result = Object.values(groups)
  
  if (sortOrder === 'oldest') {
    result.sort((a, b) => a.key.localeCompare(b.key))
  } else {
    result.sort((a, b) => b.key.localeCompare(a.key))
  }

  result.forEach(group => {
    if (sortOrder === 'alpha') {
      group.items.sort((a, b) => {
        const titleA = (a.reference_no || a.title || '').toString().toLowerCase()
        const titleB = (b.reference_no || b.title || '').toString().toLowerCase()
        return titleA.localeCompare(titleB)
      })
    } else if (sortOrder === 'oldest') {
      group.items.sort((a, b) => {
        const dateA = new Date(a.occurrence_date || a.date || a.created_at || a.request_date || a.audit_date).getTime()
        const dateB = new Date(b.occurrence_date || b.date || b.created_at || b.request_date || b.audit_date).getTime()
        return dateA - dateB
      })
    } else {
      group.items.sort((a, b) => {
        const dateA = new Date(a.occurrence_date || a.date || a.created_at || a.request_date || a.audit_date).getTime()
        const dateB = new Date(b.occurrence_date || b.date || b.created_at || b.request_date || b.audit_date).getTime()
        return dateB - dateA
      })
    }
  })

  return result
}

export default function DCCFolderContent({
  selectedFolder,
  onCloseFolder,
  searchQuery,
  onSearchChange,
  recentlyViewed,
  onOpenFolder,
  folderItems,
  standards,
  loadingStandards,
  selectedStandard,
  clauses,
  loadingClauses,
  onSelectStandard,
  onCloseStandard,
  selectedTaskFolder,
  onOpenTaskFolder,
  onCloseTaskFolder,
  ncrReports,
  loadingNcr,
  carReports,
  loadingCar,
  onSelectCar,
  qddrReports,
  loadingQddr,
  auditReports,
  loadingAudit,
  auditSchedules,
  loadingAuditSchedules,
  userRole,
  userPermissions,
  onFetchRunDetails,
  authUserId
}) {
  const normRole = String(userRole || '').trim().toLowerCase()
  const hasExplicitRights = Array.isArray(userPermissions?.rights)
  const hasExplicitPages = Array.isArray(userPermissions?.pages)
  const rights = hasExplicitRights ? userPermissions.rights : []
  const pages = hasExplicitPages ? userPermissions.pages : []
  const canAccessNcr = false
  const canAccessCar = hasExplicitRights
    ? rights.includes('view_car_reports')
    : (isAdminRole(userRole) || ['team leader', 'auditor'].includes(normRole))
  const canAccessQddr = hasExplicitRights
    ? rights.includes('view_qddr_reports')
    : isAdminRole(userRole)
  const canAccessAuditReports = hasExplicitRights
    ? rights.includes('view_audit_reports')
    : (isAdminRole(userRole) || ['auditor', 'qa officer'].includes(normRole) || (hasExplicitPages ? pages.includes('audit_tools') : false))
  const canAccessAuditSchedules = hasExplicitRights
    ? rights.includes('view_audit_schedules')
    : (isAdminRole(userRole) || ['auditor', 'qa officer'].includes(normRole) || (hasExplicitPages ? pages.includes('audit_tools') : false) || rights.includes('manage_audit_schedules'))
  const canViewSystemLogs =
    isAdminRole(userRole) ||
    (hasExplicitRights && rights.includes('view_logs'))

  const TASK_REPORT_SUBFOLDERS = [
    ...(canAccessNcr ? [{ id: 'ncr', label: 'NCR' }] : []),
    ...(canAccessQddr ? [{ id: 'qddr', label: 'QDDR' }] : []),
    ...(canAccessCar ? [{ id: 'car', label: 'CAR' }] : []),
    ...(canAccessAuditReports ? [{ id: 'audit', label: 'Audit Reports' }] : []),
    ...(canAccessAuditSchedules ? [{ id: 'audit_schedules', label: 'Audit Schedules' }] : []),
  ]

  const [localSearch, setLocalSearch] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [viewDetailsDoc, setViewDetailsDoc] = useState(null)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortOrder, setSortOrder] = useState('newest')
  const [productTypesList, setProductTypesList] = useState([])
  const [productsList, setProductsList] = useState([])
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('')
  const [selectedProductName, setSelectedProductName] = useState('')

  // Recycle Bin States
  const [deletedCars, setDeletedCars] = useState([])
  const [deletedQddrs, setDeletedQddrs] = useState([])
  const [loadingRecycleBin, setLoadingRecycleBin] = useState(false)
  const [recycleBinFilter, setRecycleBinFilter] = useState('all')
  const [restoringKey, setRestoringKey] = useState(null)
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null)
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false)
  const [dccToast, setDccToast] = useState(null)

  const loadRecycleBin = useCallback(async () => {
    setLoadingRecycleBin(true)
    try {
      const { cars, qddrs } = await fetchDeletedReports()
      setDeletedCars(cars || [])
      setDeletedQddrs(qddrs || [])
    } catch (err) {
      console.error('Failed to load Recycle Bin reports:', err)
      setDccToast({ message: 'Could not load Recycle Bin items.', type: 'error' })
    } finally {
      setLoadingRecycleBin(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFolder?.id === 'recycle_bin') {
      loadRecycleBin()
    }
  }, [selectedFolder?.id, loadRecycleBin])

  const resolveAuthId = async () => {
    if (authUserId) return authUserId
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || ''
  }

  const handleRestoreReport = async (doc, e) => {
    if (e) e.stopPropagation()
    if (!doc) return
    const key = `${doc._type}_${doc.id}`
    setRestoringKey(key)
    try {
      const uid = await resolveAuthId()
      if (doc._type === 'CAR') {
        await restoreCarReport(doc.id, uid)
      } else {
        await restoreQddrReport(doc.id, uid)
      }
      setDccToast({ message: `${doc.reference_no || doc._type} restored to Reports!`, type: 'success' })
      if (selectedDocument?.id === doc.id && selectedDocument?._type === doc._type) {
        setSelectedDocument(null)
      }
      await loadRecycleBin()
    } catch (err) {
      setDccToast({ message: err?.message || `Failed to restore ${doc._type} report.`, type: 'error' })
    } finally {
      setRestoringKey(null)
    }
  }

  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return
    setIsPermanentDeleting(true)
    try {
      const uid = await resolveAuthId()
      if (permanentDeleteTarget._type === 'CAR') {
        await permanentDeleteCarReport(permanentDeleteTarget.id, uid)
      } else {
        await permanentDeleteQddrReport(permanentDeleteTarget.id, uid)
      }
      setDccToast({ message: `${permanentDeleteTarget.reference_no || permanentDeleteTarget._type} permanently deleted.`, type: 'success' })
      if (selectedDocument?.id === permanentDeleteTarget.id && selectedDocument?._type === permanentDeleteTarget._type) {
        setSelectedDocument(null)
      }
      await loadRecycleBin()
    } catch (err) {
      setDccToast({ message: err?.message || 'Failed to permanently delete report.', type: 'error' })
    } finally {
      setIsPermanentDeleting(false)
      setPermanentDeleteTarget(null)
    }
  }

  useEffect(() => {
    Promise.all([
      fetchProductTypes().catch(() => []),
      fetchProducts().catch(() => [])
    ]).then(([pts, prods]) => {
      setProductTypesList(Array.isArray(pts) ? pts : [])
      setProductsList(Array.isArray(prods) ? prods : [])
    })
  }, [])
  
  // PDF Download State & Refs
  const [downloadingReport, setDownloadingReport] = useState(null)
  const [downloadingType, setDownloadingType] = useState(null)
  
  const carPrintRef = useRef(null)
  const ncrPrintRef = useRef(null)
  const qddrPrintRef = useRef(null)

  // Reset selected document whenever directories change
  useEffect(() => {
    setSelectedDocument(null)
    setSelectedProductTypeId('')
    setSelectedProductName('')
  }, [selectedFolder, selectedTaskFolder, selectedStandard])

  const handleShareClick = () => {
    if (!selectedDocument) return
    const textToCopy = `${selectedDocument.reference_no || selectedDocument.title} (${selectedDocument._type})`
    navigator.clipboard.writeText(textToCopy)
    setShareSuccess(true)
    setTimeout(() => setShareSuccess(false), 2000)
  }

  const handleDownloadPDF = async (report, type) => {
    setDownloadingReport(report)
    setDownloadingType(type)
    
    // Allow React a tick to render the hidden component
    setTimeout(async () => {
      let elementRef = null
      let filename = ''
      
      if (type === 'CAR') {
        elementRef = carPrintRef.current
        filename = `CAR_${report.reference_no || report.id}.pdf`
      } else if (type === 'NCR') {
        elementRef = ncrPrintRef.current
        filename = `NCR_${report.reference_no || report.id}.pdf`
      } else if (type === 'QDDR') {
        elementRef = qddrPrintRef.current
        filename = `QDDR_${report.reference_no || report.id}.pdf`
      }
      
      if (!elementRef) {
        setDownloadingReport(null)
        setDownloadingType(null)
        return
      }

      const opt = {
        margin:       0,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      }

      try {
        await html2pdf().from(elementRef).set(opt).save()
      } catch (err) {
        console.error('Error generating PDF:', err)
      } finally {
        setDownloadingReport(null)
        setDownloadingType(null)
      }
    }, 100)
  }

  const renderGroupedReports = (reports, reportType) => {
    if (!reports || !reports.length) {
      return <div className="empty-state">No {reportType} reports found.</div>
    }

    const groups = groupReportsByMonthYear(reports, sortOrder)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {groups.map((group) => (
          <div key={group.key} className="dcc-month-group">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '8px',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: '16px'
            }}>
              <Calendar size={18} color="#0f172a" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {group.label}
              </h3>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '12px',
                background: '#f1f5f9',
                color: '#64748b'
              }}>
                {group.items.length} {group.items.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            <div className="dcc-document-grid">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className={`dcc-document-card ${selectedDocument?.id === item.id ? 'active' : ''}`}
                  onClick={() => setSelectedDocument({ ...item, _type: reportType })}
                >
                  <div className="document-card-icon-wrap doc">
                    <FileText size={24} />
                  </div>
                  <span className="document-card-label">
                    {item.reference_no || item.title || `${reportType}-${item.id.slice(0, 6)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const queryClean = (searchQuery || '').trim().toLowerCase()

  // Helper to sort generic arrays
  const applySort = (arr) => {
    const withIndex = arr.map((item, index) => ({ item, index }))
    
    withIndex.sort((a, b) => {
      const getTitle = (obj) => (obj.label || obj.name || obj.title || obj.reference_no || '').toString().toLowerCase()
      const getDateValue = (obj) => {
        const val = obj.occurrence_date || obj.created_at || obj.request_date || obj.audit_date || obj.updated_at || obj.when
        return val ? new Date(val).getTime() : 0
      }
      
      if (sortOrder === 'alpha') {
        const cmp = getTitle(a.item).localeCompare(getTitle(b.item))
        return cmp !== 0 ? cmp : (a.index - b.index)
      } else if (sortOrder === 'oldest') {
        const dA = getDateValue(a.item)
        const dB = getDateValue(b.item)
        if (dA === 0 && dB === 0) return a.index - b.index
        if (dA === dB) {
          const cmp = getTitle(a.item).localeCompare(getTitle(b.item))
          return cmp !== 0 ? cmp : (a.index - b.index)
        }
        return dA - dB
      } else {
        const dA = getDateValue(a.item)
        const dB = getDateValue(b.item)
        if (dA === 0 && dB === 0) return a.index - b.index
        if (dA === dB) {
          const cmp = getTitle(a.item).localeCompare(getTitle(b.item))
          return cmp !== 0 ? cmp : (a.index - b.index)
        }
        return dB - dA
      }
    })
    
    return withIndex.map(wrapper => wrapper.item)
  }

  // 1. Root level filtering
  const filteredFolderItems = applySort(folderItems.filter((item) =>
    !queryClean || item.label.toLowerCase().includes(queryClean)
  ))

  const filteredRecentlyViewed = applySort(recentlyViewed.filter((rv) =>
    !queryClean || rv.label.toLowerCase().includes(queryClean)
  ))

  // 2. ISO Standards filtering
  const filteredStandards = applySort(standards.filter((s) =>
    !queryClean ||
    s.name.toLowerCase().includes(queryClean) ||
    (s.version && s.version.toLowerCase().includes(queryClean))
  ))

  // 3. ISO Clauses filtering
  const filteredClauses = applySort(clauses.filter((cl) =>
    !queryClean ||
    (cl.clause_number && String(cl.clause_number).toLowerCase().includes(queryClean)) ||
    (cl.title && String(cl.title).toLowerCase().includes(queryClean)) ||
    (cl.description && String(cl.description).toLowerCase().includes(queryClean))
  ))

  // 4. Task Subfolders filtering
  const filteredTaskSubfolders = applySort(TASK_REPORT_SUBFOLDERS.filter((item) =>
    !queryClean || item.label.toLowerCase().includes(queryClean)
  ))

  // 5. Task Reports filtering
  const filteredNcrReports = ncrReports.filter((ncr) =>
    !queryClean ||
    (ncr.reference_no && ncr.reference_no.toLowerCase().includes(queryClean)) ||
    (ncr.issue_type && ncr.issue_type.toLowerCase().includes(queryClean)) ||
    (ncr.description && ncr.description.toLowerCase().includes(queryClean)) ||
    (ncr.severity && ncr.severity.toLowerCase().includes(queryClean)) ||
    (ncr.product_type_name && ncr.product_type_name.toLowerCase().includes(queryClean)) ||
    (ncr.batch_number && ncr.batch_number.toLowerCase().includes(queryClean)) ||
    (ncr.location_name && ncr.location_name.toLowerCase().includes(queryClean))
  )

  const activeProductTypeObj = productTypesList.find(pt => String(pt.id) === String(selectedProductTypeId))
  const availableDccProducts = selectedProductTypeId && activeProductTypeObj && Array.isArray(activeProductTypeObj.products)
    ? activeProductTypeObj.products
    : productsList

  const matchesProductFilters = (rawProductText) => {
    const textLower = String(rawProductText || '').trim().toLowerCase()
    if (selectedProductTypeId && activeProductTypeObj) {
      if (!textLower) return false
      const allowedNames = (activeProductTypeObj.products || [])
        .map(p => String(p.product_name || '').trim().toLowerCase())
        .filter(Boolean)
      const ptNameLower = String(activeProductTypeObj.product_type_name || '').trim().toLowerCase()
      const matchesType = allowedNames.some(prodName => textLower.includes(prodName)) || (ptNameLower && textLower.includes(ptNameLower))
      if (!matchesType) return false
    }
    if (selectedProductName) {
      if (!textLower.includes(String(selectedProductName).trim().toLowerCase())) return false
    }
    return true
  }

  const filteredCarReports = carReports.filter((car) => {
    if (!matchesProductFilters(car.product_material_name)) return false
    return (
      !queryClean ||
      (car.reference_no && car.reference_no.toLowerCase().includes(queryClean)) ||
      (car.requestor && car.requestor.toLowerCase().includes(queryClean)) ||
      (car.recipient && car.recipient.toLowerCase().includes(queryClean)) ||
      (car.requesting_department && car.requesting_department.toLowerCase().includes(queryClean)) ||
      (car.responsible_department && car.responsible_department.toLowerCase().includes(queryClean)) ||
      (car.type_of_nonconformance && car.type_of_nonconformance.toLowerCase().includes(queryClean)) ||
      (car.product_material_name && car.product_material_name.toLowerCase().includes(queryClean)) ||
      (car.model_type && car.model_type.toLowerCase().includes(queryClean)) ||
      (car.control_no && car.control_no.toLowerCase().includes(queryClean)) ||
      (car.details_of_nonconformance && car.details_of_nonconformance.toLowerCase().includes(queryClean)) ||
      (car.root_cause_analysis && car.root_cause_analysis.toLowerCase().includes(queryClean)) ||
      (car.corrective_action && car.corrective_action.toLowerCase().includes(queryClean)) ||
      (car.preventive_action && car.preventive_action.toLowerCase().includes(queryClean))
    )
  })

  const filteredQddrReports = qddrReports.filter((q) => {
    if (!matchesProductFilters(q.material_description)) return false
    return (
      !queryClean ||
      (q.reference_no && q.reference_no.toLowerCase().includes(queryClean)) ||
      (q.location && q.location.toLowerCase().includes(queryClean)) ||
      (q.trucker_broker && q.trucker_broker.toLowerCase().includes(queryClean)) ||
      (q.plate_number && q.plate_number.toLowerCase().includes(queryClean)) ||
      (q.po_reference && q.po_reference.toLowerCase().includes(queryClean)) ||
      (q.brand_supplier && q.brand_supplier.toLowerCase().includes(queryClean)) ||
      (q.material_description && q.material_description.toLowerCase().includes(queryClean)) ||
      (q.material_code && q.material_code.toLowerCase().includes(queryClean)) ||
      (q.batch_code_su_number && q.batch_code_su_number.toLowerCase().includes(queryClean)) ||
      (q.reason_of_discrepancy && q.reason_of_discrepancy.toLowerCase().includes(queryClean)) ||
      (q.corrective_action && q.corrective_action.toLowerCase().includes(queryClean)) ||
      (q.preventive_action && q.preventive_action.toLowerCase().includes(queryClean))
    )
  })

  const filteredAuditReports = auditReports.filter((audit) =>
    !queryClean ||
    (audit.title && audit.title.toLowerCase().includes(queryClean)) ||
    (audit.standard_name && audit.standard_name.toLowerCase().includes(queryClean)) ||
    (audit.auditor_name && audit.auditor_name.toLowerCase().includes(queryClean))
  )

  const filteredAuditSchedules = auditSchedules.filter((sched) =>
    !queryClean ||
    (sched.title && sched.title.toLowerCase().includes(queryClean)) ||
    (sched.standard_name && sched.standard_name.toLowerCase().includes(queryClean)) ||
    (sched.auditor_name && sched.auditor_name.toLowerCase().includes(queryClean)) ||
    (sched.status && sched.status.toLowerCase().includes(queryClean))
  )

  // Navigation click helpers
  const handleNavFolderClick = (item) => {
    if (selectedFolder?.id === item.id) {
      onCloseFolder()
    } else {
      onOpenFolder(item)
    }
  }

  const handleNavTaskSubfolderClick = (sub) => {
    if (selectedTaskFolder?.id === sub.id) {
      onCloseTaskFolder()
    } else {
      onOpenTaskFolder(sub)
    }
  }

  const subFolderLabel = selectedTaskFolder ? ` > ${selectedTaskFolder.label}` : ''
  const backHandler =
    selectedStandard
      ? onCloseStandard
      : selectedFolder?.id === 'task_reports' && selectedTaskFolder
        ? onCloseTaskFolder
        : onCloseFolder

  // Calculate file properties for the mockup design
  const getFileProperties = (doc) => {
    if (!doc) return {}
    const createdDate = doc.created_at || doc.occurrence_date || doc.scheduled_date || 'N/A'
    const formattedDate = createdDate !== 'N/A' ? new Date(createdDate).toLocaleDateString() : 'N/A'
    
    return {
      type: doc._type + ' File',
      location: `/DCC/Task Reports/${doc._type}`,
      modified: formattedDate,
      size: '42 KB'
    }
  }

  const fileProps = getFileProperties(selectedDocument)

  return (
    <div className="dcc-layout-container">
      {/* ── COLUMN 1: LEFT NAVIGATION PANE ────────────────────────────────── */}
      <div className="dcc-left-pane">
        <h3 className="dcc-left-pane-title">Directories</h3>
        
        {folderItems.map((item) => {
          const isActive = selectedFolder?.id === item.id
          return (
            <div key={item.id}>
              <button 
                onClick={() => handleNavFolderClick(item)} 
                className={`dcc-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.id === 'system_logs' ? (
                  <Terminal size={16} />
                ) : item.id === 'recycle_bin' ? (
                  <Trash2 size={16} />
                ) : (
                  <Folder size={16} />
                )}
                <span>{item.label}</span>
              </button>

              {/* Nested submenu for Task Reports */}
              {item.id === 'task_reports' && isActive && (
                <div className="dcc-nav-sub-list">
                  {TASK_REPORT_SUBFOLDERS.map((sub) => {
                    const isSubActive = selectedTaskFolder?.id === sub.id
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleNavTaskSubfolderClick(sub)}
                        className={`dcc-nav-sub-item ${isSubActive ? 'active' : ''}`}
                      >
                        <ChevronRight size={12} />
                        <span>{sub.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── COLUMN 2: CENTER MAIN CONTENT EXPLORER ────────────────────────── */}
      <div className="dcc-center-pane">
        {selectedFolder && (
          <div className="dcc-breadcrumbs-header">
            <button onClick={backHandler} className="back-button-mini" title={selectedStandard ? 'Back to ISO standards' : 'Back'}>
              <ArrowLeft size={20} />
            </button>
            <span className="dcc-breadcrumb-text">
              DCC &gt; {selectedFolder.label}{subFolderLabel}
              {selectedStandard ? ` > ${selectedStandard.name}` : ''}
            </span>
          </div>
        )}

        <div className="dcc-search-area">
          <div className="search-container-centered">
            <div style={{ position: 'relative', width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', margin: '0 auto' }}>
              <Search size={18} className="search-icon-absolute" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={
                  selectedFolder
                    ? `Search ${selectedFolder.label}${subFolderLabel}...`
                    : 'Search documents or folders...'
                }
                className="search-bar-field"
              />
              <button className="filter-icon-absolute" title="Filter options" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                <SlidersHorizontal size={18} />
              </button>
              {showFilterMenu && (
                <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '240px', padding: '10px' }}>
                  <div style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort By</div>
                  <div onClick={() => { setSortOrder('newest'); setShowFilterMenu(false); }} style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '8px', background: sortOrder === 'newest' ? '#f1f5f9' : 'transparent', fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sortOrder === 'newest' ? '#0891b2' : 'transparent' }}></div>
                    Newest First
                  </div>
                  <div onClick={() => { setSortOrder('oldest'); setShowFilterMenu(false); }} style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '8px', background: sortOrder === 'oldest' ? '#f1f5f9' : 'transparent', fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sortOrder === 'oldest' ? '#0891b2' : 'transparent' }}></div>
                    Oldest First
                  </div>
                  <div onClick={() => { setSortOrder('alpha'); setShowFilterMenu(false); }} style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '8px', background: sortOrder === 'alpha' ? '#f1f5f9' : 'transparent', fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sortOrder === 'alpha' ? '#0891b2' : 'transparent' }}></div>
                    Alphabetical (A-Z)
                  </div>

                  {selectedFolder?.id === 'task_reports' && (selectedTaskFolder?.id === 'car' || selectedTaskFolder?.id === 'qddr') && (
                    <>
                      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
                      <div style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Filter by Product
                      </div>
                      <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Product Type</span>
                          <select
                            value={selectedProductTypeId}
                            onChange={(e) => {
                              setSelectedProductTypeId(e.target.value)
                              setSelectedProductName('')
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a', background: '#f8fafc' }}
                          >
                            <option value="">All Product Types</option>
                            {productTypesList.map((pt) => (
                              <option key={pt.id} value={String(pt.id)}>{pt.product_type_name}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Product / Material</span>
                          <select
                            value={selectedProductName}
                            onChange={(e) => setSelectedProductName(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a', background: '#f8fafc' }}
                          >
                            <option value="">All Products / Materials</option>
                            {availableDccProducts.map((p) => (
                              <option key={p.id} value={p.product_name}>{p.product_name}</option>
                            ))}
                          </select>
                        </div>

                        {(selectedProductTypeId || selectedProductName) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductTypeId('')
                              setSelectedProductName('')
                            }}
                            style={{ marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                          >
                            Clear Product Filters
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {selectedFolder?.id === 'task_reports' && (selectedTaskFolder?.id === 'car' || selectedTaskFolder?.id === 'qddr') && (
              <div className="dcc-quick-filter-row">
                <select
                  value={selectedProductTypeId}
                  onChange={(e) => {
                    setSelectedProductTypeId(e.target.value)
                    setSelectedProductName('')
                  }}
                  className={`dcc-quick-filter-select ${selectedProductTypeId ? 'active' : ''}`}
                  title="Filter by Product Type"
                >
                  <option value="">All Product Types</option>
                  {productTypesList.map((pt) => (
                    <option key={pt.id} value={String(pt.id)}>{pt.product_type_name}</option>
                  ))}
                </select>

                <select
                  value={selectedProductName}
                  onChange={(e) => setSelectedProductName(e.target.value)}
                  className={`dcc-quick-filter-select ${selectedProductName ? 'active' : ''}`}
                  title="Filter by Product / Material"
                >
                  <option value="">All Products / Materials</option>
                  {availableDccProducts.map((p) => (
                    <option key={p.id} value={p.product_name}>{p.product_name}</option>
                  ))}
                </select>

                {(selectedProductTypeId || selectedProductName) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductTypeId('')
                      setSelectedProductName('')
                    }}
                    className="dcc-quick-filter-clear-btn"
                    title="Clear product filters"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </div>


        <div className="dcc-explorer-viewport">
          {/* ROOT VIEW */}
          {!selectedFolder && (
            <div className="flex-column" style={{ gap: '24px' }}>
              <div>
                <h3 className="recently-viewed-heading">Workspace Folders</h3>
                <div className="dcc-document-grid">
                  {filteredFolderItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => onOpenFolder(item)} 
                      className="dcc-document-card"
                    >
                      <div className="document-card-icon-wrap folder">
                        {item.id === 'recycle_bin' ? <Trash2 size={24} /> : <Folder size={24} />}
                      </div>
                      <span className="document-card-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="recently-viewed-heading">Recently Viewed</h3>
                {!filteredRecentlyViewed.length ? (
                  <div className="recent-empty">No recently viewed items.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {filteredRecentlyViewed.map((rv) => (
                      <div
                        key={rv.id}
                        className="recent-document-card dcc-recent-document-card"
                        onClick={() => onOpenFolder({ id: rv.id, label: rv.label })}
                      >
                        <FileText size={18} className="icon-green" />
                        <div className="col-gap-2">
                          <span className="recent-doc-title">{rv.label}</span>
                          <span className="recent-doc-sub">
                            {new Date(rv.when).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SYSTEM LOGS TABLE */}
          {selectedFolder?.id === 'system_logs' && (
            canViewSystemLogs ? (
              <SystemLogsPanel onClose={onCloseFolder} searchQuery={searchQuery} />
            ) : (
              <div className="empty-state">
                <ShieldAlert size={40} style={{ marginBottom: '12px', color: '#dc2626' }} />
                <p>You do not have permission to view System Logs.</p>
              </div>
            )
          )}

          {/* RECYCLE BIN */}
          {selectedFolder?.id === 'recycle_bin' && (() => {
            const combinedDeleted = [
              ...(recycleBinFilter !== 'qddr' ? deletedCars : []),
              ...(recycleBinFilter !== 'car' ? deletedQddrs : [])
            ].filter(doc => {
              const rawProd = doc._type === 'CAR' ? doc.product_material_name : doc.material_description
              if (!matchesProductFilters(rawProd)) return false
              if (!queryClean) return true
              const text = [
                doc.reference_no,
                doc._type,
                doc.requestor,
                doc.recipient,
                doc.requesting_department,
                doc.responsible_department,
                doc.type_of_nonconformance,
                doc.product_material_name,
                doc.details_of_nonconformance,
                doc.location,
                doc.material_description,
                doc.material_code,
                doc.reason_of_discrepancy
              ].filter(Boolean).join(' ').toLowerCase()
              return text.includes(queryClean)
            })

            const sortedDeleted = applySort(combinedDeleted)

            return (
              <div className="flex-column" style={{ gap: '16px', padding: '4px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRecycleBinFilter('all')}
                      className={`btn-quick-toggle ${recycleBinFilter === 'all' ? 'active' : ''}`}
                    >
                      All Deleted ({deletedCars.length + deletedQddrs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecycleBinFilter('car')}
                      className={`btn-quick-toggle ${recycleBinFilter === 'car' ? 'active' : ''}`}
                    >
                      CAR ({deletedCars.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecycleBinFilter('qddr')}
                      className={`btn-quick-toggle ${recycleBinFilter === 'qddr' ? 'active' : ''}`}
                    >
                      QDDR ({deletedQddrs.length})
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={loadRecycleBin}
                    disabled={loadingRecycleBin}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12.5px' }}
                  >
                    <RefreshCw size={14} className={loadingRecycleBin ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {loadingRecycleBin ? (
                  <div className="empty-state">Loading Recycle Bin...</div>
                ) : sortedDeleted.length === 0 ? (
                  <div className="empty-state">
                    <Trash2 size={36} style={{ marginBottom: '10px', color: '#94a3b8' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Recycle Bin is empty</p>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>Deleted CAR and QDDR reports will appear here so you can restore them anytime.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sortedDeleted.map((doc) => {
                      const isCar = doc._type === 'CAR'
                      const key = `${doc._type}_${doc.id}`
                      const isSelected = selectedDocument?.id === doc.id && selectedDocument?._type === doc._type
                      const isRestoring = restoringKey === key
                      const deletedDateStr = doc.updated_at || doc.created_at
                      const formattedDeletedDate = deletedDateStr ? new Date(deletedDateStr).toLocaleString() : 'N/A'
                      const summaryText = isCar
                        ? (doc.details_of_nonconformance || doc.type_of_nonconformance || 'No description')
                        : (doc.reason_of_discrepancy || doc.material_description || 'No discrepancy details')
                      const metaLabel = isCar
                        ? `${doc.responsible_department || doc.requesting_department || 'No Dept'} • ${doc.product_material_name || doc.type_of_nonconformance || 'General'}`
                        : `${doc.location || 'Warehouse'} • ${doc.material_description || 'No Material'}`

                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedDocument(doc)}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '14px',
                            padding: '14px 16px',
                            borderRadius: '10px',
                            background: isSelected ? '#f0f9ff' : '#ffffff',
                            border: isSelected ? '1.5px solid #0891b2' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 280px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: isCar ? 'rgba(8, 145, 178, 0.12)' : 'rgba(217, 119, 6, 0.14)',
                                color: isCar ? '#0891b2' : '#b45309'
                              }}>
                                {doc._type}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>
                                {doc.reference_no || `${doc._type} #${doc.id}`}
                              </span>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>
                                • {metaLabel}
                              </span>
                            </div>
                            <p style={{
                              margin: 0,
                              fontSize: '13px',
                              color: '#334155',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {summaryText}
                            </p>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                              Deleted: {formattedDeletedDate}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <button
                              type="button"
                              disabled={isRestoring}
                              onClick={(e) => handleRestoreReport(doc, e)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#059669',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: isRestoring ? 'not-allowed' : 'pointer'
                              }}
                              title="Restore this report back to active Reports"
                            >
                              <RotateCcw size={14} />
                              {isRestoring ? 'Restoring...' : 'Restore'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPermanentDeleteTarget(doc)
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                background: 'rgba(220, 38, 38, 0.08)',
                                color: '#dc2626',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              title="Permanently delete this report from database"
                            >
                              <Trash2 size={14} />
                              Delete Permanently
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ISO TERMS & COMPLIANCE POLICY */}
          {selectedFolder?.id === 'terms_policy' && (
            <div className="flex-column" style={{ gap: '20px', padding: '12px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <ShieldAlert size={22} color="#0891b2" />
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>ISO Terms & System Compliance Policy</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#334155', fontSize: '13.5px', lineHeight: '1.6' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '14.5px' }}>1. Quality & ISO Standard Adherence</h4>
                    <p style={{ margin: 0 }}>
                      All Non-Conformance Reports (NCR), Corrective Action Requests (CAR), and Quality Defect & Deviation Reports (QDDR) created within ResQ must accurately represent operational non-conformances and comply with active ISO 22000:2018 food safety and quality management standards.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '14.5px' }}>2. Data Integrity & Verification</h4>
                    <p style={{ margin: 0 }}>
                      Users are required to ensure that all reported findings, investigation records, uploaded evidence files, and root-cause analysis descriptions are genuine, un-altered, and subject to internal and external audit reviews.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '14.5px' }}>3. Role-Based Governance</h4>
                    <p style={{ margin: 0 }}>
                      System rights (accepting, declining, assigning, and verifying corrective actions) are strictly controlled via role-based access permissions. Unauthorized attempt to modify historical reports or override system audits is prohibited.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ISO MODULES */}
          {selectedFolder?.id === 'iso_modules' && (
            <div className="flex-column full-height" style={{ gap: '20px' }}>
              {!selectedStandard ? (
                <div>
                  <h3 className="recently-viewed-heading">ISO Standards</h3>
                  {loadingStandards ? (
                    <div>Loading standards...</div>
                  ) : !filteredStandards.length ? (
                    <div className="empty-state">No active ISO standards found.</div>
                  ) : (
                    <div className="dcc-document-grid">
                      {filteredStandards.map((s) => (
                        <div
                          key={s.id}
                          className="dcc-document-card"
                          onClick={() => onSelectStandard(s)}
                        >
                          <div className="document-card-icon-wrap iso">
                            <Folder size={24} />
                          </div>
                          <span className="document-card-label" title={s.name}>
                            {s.name}
                            {s.version ? ` - ${s.version}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <ISOClausesTable 
                  selectedStandard={selectedStandard} 
                  clauses={filteredClauses} 
                  loadingClauses={loadingClauses} 
                  onBackToStandards={onCloseStandard}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          )}

          {/* TASK REPORTS SUBFOLDERS GRID */}
          {selectedFolder?.id === 'task_reports' && !selectedTaskFolder && (
            <div>
              <h3 className="recently-viewed-heading">Report Folders</h3>
              {!filteredTaskSubfolders.length ? (
                <div className="empty-state">No report folders are available based on your role permissions.</div>
              ) : (
                <div className="dcc-document-grid">
                  {filteredTaskSubfolders.map((item) => (
                    <div
                      key={item.id}
                      className="dcc-document-card"
                      onClick={() => onOpenTaskFolder(item)}
                    >
                      <div className="document-card-icon-wrap folder">
                        <Folder size={24} />
                      </div>
                      <span className="document-card-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENT CARDS GRID FOR REPORTS (GROUPED BY MONTH & YEAR) */}
          {selectedFolder?.id === 'task_reports' && selectedTaskFolder && (
            <div className="flex-column" style={{ gap: '16px', height: 'auto' }}>
              {selectedTaskFolder.id === 'ncr' && (
                !canAccessNcr ? (
                  <div className="empty-state">You do not have permission to access NCR reports.</div>
                ) : loadingNcr ? (
                  <div>Loading NCR reports...</div>
                ) : (
                  renderGroupedReports(filteredNcrReports, 'NCR')
                )
              )}

              {selectedTaskFolder.id === 'car' && (
                !canAccessCar ? (
                  <div className="empty-state">You do not have permission to access CAR reports.</div>
                ) : loadingCar ? (
                  <div>Loading CAR reports...</div>
                ) : (
                  renderGroupedReports(filteredCarReports, 'CAR')
                )
              )}

              {selectedTaskFolder.id === 'qddr' && (
                !canAccessQddr ? (
                  <div className="empty-state">You do not have permission to access QDDR reports.</div>
                ) : loadingQddr ? (
                  <div>Loading QDDR reports...</div>
                ) : (
                  renderGroupedReports(filteredQddrReports, 'QDDR')
                )
              )}

              {selectedTaskFolder.id === 'audit' && (
                !canAccessAuditReports ? (
                  <div className="empty-state">You do not have permission to access Audit reports.</div>
                ) : loadingAudit ? (
                  <div>Loading Audit reports...</div>
                ) : (
                  renderGroupedReports(filteredAuditReports, 'AUDIT_RUN')
                )
              )}

              {selectedTaskFolder.id === 'audit_schedules' && (
                !canAccessAuditSchedules ? (
                  <div className="empty-state">You do not have permission to access Audit schedules.</div>
                ) : loadingAuditSchedules ? (
                  <div>Loading Schedules...</div>
                ) : (
                  renderGroupedReports(filteredAuditSchedules, 'AUDIT_SCHED')
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── COLUMN 3: RIGHT DETAILS PANE (CONDITIONAL) ────────────────────── */}
      {selectedFolder && selectedDocument && (
        <div className="dcc-right-pane">
          <button 
            type="button" 
            onClick={() => setSelectedDocument(null)} 
            className="dcc-details-close-btn"
            title="Close details"
          >
            <X size={18} />
          </button>
          {selectedDocument ? (
            <div className="dcc-details-container">
              {/* Mockup Top Preview Box */}
              <div className="dcc-details-preview-box">
                <File size={32} className="preview-icon-svg" />
                <span className="preview-extension-text">.{selectedDocument._type.toLowerCase()}</span>
              </div>

              {/* Title & Share Button */}
              <div className="dcc-details-header-row">
                <div style={{ flex: 1 }}>
                  <h3 className="dcc-details-title">
                    {selectedDocument.reference_no || selectedDocument.title || 'Document'}
                  </h3>
                  <span className="dcc-details-subtitle">TYPE: {selectedDocument._type}</span>
                </div>
              </div>

              {/* Details Key-Value List */}
              <div className="dcc-details-block">
                <h4 className="dcc-details-section-heading">Details</h4>
                
                <table className="dcc-details-table-grid">
                  <tbody>
                    <tr>
                      <td className="dcc-details-label-col">Type</td>
                      <td className="dcc-details-value-col">{fileProps.type}</td>
                    </tr>
                    <tr>
                      <td className="dcc-details-label-col">Size</td>
                      <td className="dcc-details-value-col">{fileProps.size}</td>
                    </tr>
                    <tr>
                      <td className="dcc-details-label-col">File location</td>
                      <td className="dcc-details-value-col text-wrap">{fileProps.location}</td>
                    </tr>
                    <tr>
                      <td className="dcc-details-label-col">Date modified</td>
                      <td className="dcc-details-value-col">{fileProps.modified}</td>
                    </tr>
                    
                    {/* Dynamic Details based on type */}
                    {selectedDocument._type === 'CAR' && (
                      <>
                        <tr>
                          <td className="dcc-details-label-col">Issue Type</td>
                          <td className="dcc-details-value-col">{selectedDocument.type_of_nonconformance || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">Requestor</td>
                          <td className="dcc-details-value-col">{selectedDocument.requestor || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">Recipient</td>
                          <td className="dcc-details-value-col">{selectedDocument.recipient || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">Responsible Dept</td>
                          <td className="dcc-details-value-col">{selectedDocument.responsible_department || '—'}</td>
                        </tr>
                      </>
                    )}

                    {selectedDocument._type === 'NCR' && (
                      <>
                        <tr>
                          <td className="dcc-details-label-col">Category</td>
                          <td className="dcc-details-value-col">{selectedDocument.issue_type || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">Severity</td>
                          <td className="dcc-details-value-col">
                            <span className={`iso-status-pill ${SEVERITY_COLORS[selectedDocument.severity] || ''}`}>
                              {selectedDocument.severity || '—'}
                            </span>
                          </td>
                        </tr>
                      </>
                    )}

                    {selectedDocument._type === 'QDDR' && (
                      <>
                        <tr>
                          <td className="dcc-details-label-col">Location</td>
                          <td className="dcc-details-value-col">{selectedDocument.location || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">Material</td>
                          <td className="dcc-details-value-col">{selectedDocument.material_description || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">PO Ref</td>
                          <td className="dcc-details-value-col">{selectedDocument.po_reference || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">Plate No</td>
                          <td className="dcc-details-value-col">{selectedDocument.plate_number || '—'}</td>
                        </tr>
                      </>
                    )}

                    {selectedDocument._type === 'AUDIT_SCHED' && (
                      <>
                        {selectedDocument.standard_name && (
                          <tr>
                            <td className="dcc-details-label-col">Standard</td>
                            <td className="dcc-details-value-col">{selectedDocument.standard_name}</td>
                          </tr>
                        )}
                        {selectedDocument.auditor_name && (
                          <tr>
                            <td className="dcc-details-label-col">Auditor</td>
                            <td className="dcc-details-value-col">{selectedDocument.auditor_name}</td>
                          </tr>
                        )}
                        {selectedDocument.scheduled_date && (
                          <tr>
                            <td className="dcc-details-label-col">Scheduled Date</td>
                            <td className="dcc-details-value-col">{selectedDocument.scheduled_date}</td>
                          </tr>
                        )}
                        {selectedDocument.department && (
                          <tr>
                            <td className="dcc-details-label-col">Department</td>
                            <td className="dcc-details-value-col">{selectedDocument.department}</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons Section */}
              <div className="dcc-details-actions">
                <div className="dcc-details-status-box">
                  <span className="dcc-details-label">Status</span>
                  <span className={`iso-status-pill ${
                    String(selectedDocument.status || '').toLowerCase() === 'closed' ? 'is-closed' : 
                    String(selectedDocument.status || '').toLowerCase() === 'completed' ? 'is-active' :
                    String(selectedDocument.status || '').toLowerCase() === 'under_verification' ? 'is-active' : 'is-open'
                  }`}>
                    {selectedDocument.status 
                      ? (String(selectedDocument.status).charAt(0).toUpperCase() + String(selectedDocument.status).slice(1).replace(/_/g, ' '))
                      : 'Active'}
                  </span>
                </div>

                {/* View Details Button */}
                {['NCR', 'QDDR'].includes(selectedDocument._type) && (
                  <button 
                    onClick={() => setViewDetailsDoc(selectedDocument)} 
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Eye size={15} style={{ marginRight: '6px' }} />
                    View Details
                  </button>
                )}

                {/* Open CAPA Details */}
                {selectedDocument._type === 'CAR' && (
                  <button 
                    onClick={() => onSelectCar(selectedDocument)} 
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Eye size={15} style={{ marginRight: '6px' }} />
                    View Details
                  </button>
                )}

                {/* View Checklist */}
                {selectedDocument._type === 'AUDIT_RUN' && (
                  <button 
                    onClick={() => onFetchRunDetails(selectedDocument)} 
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Eye size={15} style={{ marginRight: '6px' }} />
                    View Details
                  </button>
                )}

                {/* PDF download trigger */}
                {['CAR', 'NCR', 'QDDR'].includes(selectedDocument._type) && (
                  <button
                    onClick={() => handleDownloadPDF(selectedDocument, selectedDocument._type)}
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Download size={15} style={{ marginRight: '6px' }} /> Download PDF
                  </button>
                )}

                {/* Restore & Permanent Delete triggers when viewing a Recycle Bin item */}
                {String(selectedDocument.status || '').toLowerCase() === 'deleted' && (
                  <>
                    <button
                      type="button"
                      disabled={restoringKey === `${selectedDocument._type}_${selectedDocument.id}`}
                      onClick={(e) => handleRestoreReport(selectedDocument, e)}
                      className="btn btn-outline dcc-details-action-btn"
                      style={{ borderColor: '#10b981', color: '#059669' }}
                    >
                      <RotateCcw size={15} style={{ marginRight: '6px' }} />
                      {restoringKey === `${selectedDocument._type}_${selectedDocument.id}` ? 'Restoring...' : 'Restore Report'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermanentDeleteTarget(selectedDocument)}
                      className="btn btn-outline dcc-details-action-btn"
                      style={{ borderColor: '#ef4444', color: '#dc2626' }}
                    >
                      <Trash2 size={15} style={{ marginRight: '6px' }} />
                      Delete Permanently
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="dcc-details-placeholder">
              <FileText size={48} strokeWidth={1} />
              <p>Select a document card from the grid explorer to view its full details.</p>
            </div>
          )}
        </div>
      )}

      {dccToast && (
        <div className="reports-toast-container">
          <Toast message={dccToast.message} type={dccToast.type} onClose={() => setDccToast(null)} />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!permanentDeleteTarget}
        title={`Permanently Delete ${permanentDeleteTarget?._type || 'Report'}`}
        message={`Are you sure you want to permanently delete ${permanentDeleteTarget?.reference_no || 'this report'}? This will remove it from the Recycle Bin forever and cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isPermanentDeleting}
        onConfirm={confirmPermanentDelete}
        onCancel={() => {
          if (!isPermanentDeleting) setPermanentDeleteTarget(null)
        }}
      />

      <DCCReportDetailsModal
        isOpen={!!viewDetailsDoc}
        onClose={() => setViewDetailsDoc(null)}
        document={viewDetailsDoc}
        onDownloadPDF={handleDownloadPDF}
      />

      {/* Hidden Print Templates for PDF Generation */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {downloadingType === 'CAR' && <CARPrintTemplate ref={carPrintRef} report={downloadingReport} />}
        {downloadingType === 'NCR' && <NCRPrintTemplate ref={ncrPrintRef} report={downloadingReport} />}
        {downloadingType === 'QDDR' && <QDDRPrintTemplate ref={qddrPrintRef} report={downloadingReport} />}
      </div>
    </div>
  )
}

function ISOStandardsList({ standards, loadingStandards, onSelectStandard }) {
  if (loadingStandards) return <div>Loading standards...</div>
  if (!standards.length) return <div className="empty-state">No active ISO standards found.</div>

  return (
    <div>
      <h3 className="recently-viewed-heading">ISO Modules</h3>
      <div className="dcc-document-grid">
        {standards.map((s) => (
          <div
            key={s.id}
            className="dcc-document-card"
            onClick={() => onSelectStandard(s)}
          >
            <div className="document-card-icon-wrap iso">
              <Folder size={22} className="icon-fill-soft" />
            </div>
            <div>
              <div className="document-card-label">
                {s.name}
                {s.version ? ` - ${s.version}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function highlightText(text, highlight) {
  if (!text) return ''
  if (!highlight || !highlight.trim()) return text
  
  const cleanHighlight = highlight.trim()
  const regex = new RegExp(`(${cleanHighlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
  const parts = String(text).split(regex)
  
  return parts.map((part, index) => 
    regex.test(part) 
      ? <mark key={index} style={{ backgroundColor: '#fef08a', color: '#0f172a', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
      : part
  )
}

function ExpandableText({ text, highlight }) {
  // Clean up single newlines from PDF copy-paste (replace with space) but keep double newlines
  let cleanText = text.replace(/([^\n])\n([^\n])/g, '$1 $2')
  
  // Simple parsing to add line breaks before "Note X to entry:" or similar bullet points if they exist
  const formattedText = cleanText.replace(/(Note \d+ to entry:)/g, '\n\n$1')

  return (
    <div style={{ whiteSpace: 'pre-line', textAlign: 'justify' }}>
      {highlightText(formattedText, highlight)}
    </div>
  )
}

function ISOClausesTable({ selectedStandard, clauses, loadingClauses, onBackToStandards, searchQuery }) {
  return (
    <div className="flex-column full-height" style={{ width: '100%', height: '100%' }}>
      <div className="dcc-scrollable-table-box" style={{ flex: 1, margin: 0, background: '#ffffff' }}>
        <table className="iso-table iso-clauses-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Clause</th>
              <th>Title</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clauses.map((cl) => (
              <tr key={cl.id} className={cl.is_active ? '' : 'muted-row'}>
                <td style={{ width: '120px', fontWeight: 600 }}>{cl.clause_number}</td>
                <td>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    <span className="mobile-only-clause-num">Clause {cl.clause_number}: </span>
                    {highlightText(cl.title, searchQuery)}
                  </div>
                  <div className="clause-description">
                    {cl.description ? (
                      <ExpandableText text={cl.description} highlight={searchQuery} />
                    ) : (
                      <span className="muted">No description added</span>
                    )}
                  </div>
                </td>
                <td style={{ width: '120px' }}>
                  {!cl.is_active && (
                    <span className="iso-status-pill is-inactive">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
