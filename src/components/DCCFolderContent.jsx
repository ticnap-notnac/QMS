import { useState, useRef, useEffect } from 'react'
import { isAdminRole } from '../utils/roleUtils.js'
import { Folder, FileText, Search, ArrowLeft, AlertCircle, ChevronDown, ChevronRight, Download, Terminal, ShieldAlert, Share2, Settings, File, Eye, X, Calendar } from 'lucide-react'
import SystemLogsPanel from './Panels/SystemLogsPanel.jsx'
import { supabase } from '../utils/supabase'
import html2pdf from 'html2pdf.js'
import CARPrintTemplate from './Print/CARPrintTemplate.jsx'
import NCRPrintTemplate from './Print/NCRPrintTemplate.jsx'
import QDDRPrintTemplate from './Print/QDDRPrintTemplate.jsx'
import DCCReportDetailsModal from './Modals/DCCReportDetailsModal.jsx'


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
function groupReportsByMonthYear(reports) {
  if (!reports || !reports.length) return []

  const groups = {}

  reports.forEach((item) => {
    const rawDate = item.occurrence_date || item.created_at || item.request_date || item.audit_date
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

  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
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
  onFetchRunDetails
}) {
  const normRole = String(userRole || '').trim().toLowerCase()
  const TASK_REPORT_SUBFOLDERS = [
    { id: 'ncr', label: 'NCR' },
    ...(normRole !== 'warehouse staff' ? [{ id: 'qddr', label: 'QDDR' }] : []),
    ...(isAdminRole(userRole) || normRole === 'auditor' ? [
      { id: 'car', label: 'CAR' },
      { id: 'audit', label: 'Audit Reports' },
      { id: 'audit_schedules', label: 'Audit Schedules' },
    ] : [])
  ]

  const [localSearch, setLocalSearch] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [viewDetailsDoc, setViewDetailsDoc] = useState(null)
  const [shareSuccess, setShareSuccess] = useState(false)
  
  // PDF Download State & Refs
  const [downloadingReport, setDownloadingReport] = useState(null)
  const [downloadingType, setDownloadingType] = useState(null)
  
  const carPrintRef = useRef(null)
  const ncrPrintRef = useRef(null)
  const qddrPrintRef = useRef(null)

  // Reset selected document whenever directories change
  useEffect(() => {
    setSelectedDocument(null)
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

    const groups = groupReportsByMonthYear(reports)

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

  // 1. Root level filtering
  const filteredFolderItems = folderItems.filter((item) =>
    !queryClean || item.label.toLowerCase().includes(queryClean)
  )

  const filteredRecentlyViewed = recentlyViewed.filter((rv) =>
    !queryClean || rv.label.toLowerCase().includes(queryClean)
  )

  // 2. ISO Standards filtering
  const filteredStandards = standards.filter((s) =>
    !queryClean ||
    s.name.toLowerCase().includes(queryClean) ||
    (s.version && s.version.toLowerCase().includes(queryClean))
  )

  // 3. ISO Clauses filtering
  const filteredClauses = clauses.filter((cl) =>
    !queryClean ||
    (cl.clause_number && String(cl.clause_number).toLowerCase().includes(queryClean)) ||
    (cl.title && String(cl.title).toLowerCase().includes(queryClean)) ||
    (cl.description && String(cl.description).toLowerCase().includes(queryClean))
  )

  // 4. Task Subfolders filtering
  const filteredTaskSubfolders = TASK_REPORT_SUBFOLDERS.filter((item) =>
    !queryClean || item.label.toLowerCase().includes(queryClean)
  )

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

  const filteredCarReports = carReports.filter((car) =>
    !queryClean ||
    (car.reference_no && car.reference_no.toLowerCase().includes(queryClean)) ||
    (car.requestor && car.requestor.toLowerCase().includes(queryClean)) ||
    (car.recipient && car.recipient.toLowerCase().includes(queryClean)) ||
    (car.requesting_department && car.requesting_department.toLowerCase().includes(queryClean)) ||
    (car.responsible_department && car.responsible_department.toLowerCase().includes(queryClean)) ||
    (car.product_material_name && car.product_material_name.toLowerCase().includes(queryClean)) ||
    (car.model_type && car.model_type.toLowerCase().includes(queryClean)) ||
    (car.control_no && car.control_no.toLowerCase().includes(queryClean)) ||
    (car.details_of_nonconformance && car.details_of_nonconformance.toLowerCase().includes(queryClean))
  )

  const filteredQddrReports = qddrReports.filter((q) =>
    !queryClean ||
    (q.reference_no && q.reference_no.toLowerCase().includes(queryClean)) ||
    (q.recipient_name && q.recipient_name.toLowerCase().includes(queryClean)) ||
    (q.discovery_location && q.discovery_location.toLowerCase().includes(queryClean)) ||
    (q.defect_description && q.defect_description.toLowerCase().includes(queryClean)) ||
    (q.root_cause_analysis && q.root_cause_analysis.toLowerCase().includes(queryClean))
  )

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
                {item.id === 'system_logs' ? <Terminal size={16} /> : <Folder size={16} />}
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
            <Search size={16} className="search-icon-absolute" />
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
                        <Folder size={24} />
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
            isAdminRole(userRole) ? (
              <SystemLogsPanel onClose={onCloseFolder} searchQuery={searchQuery} />
            ) : (
              <div className="empty-state">
                <ShieldAlert size={40} style={{ marginBottom: '12px', color: '#dc2626' }} />
                <p>You do not have permission to view System Logs.</p>
              </div>
            )
          )}

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
                      All Non-Conformance Reports (NCR), Corrective Action Requests (CAR), and Quality Defect & Deviation Reports (QDDR) created within QFlow must accurately represent operational non-conformances and comply with active ISO 22000:2018 food safety and quality management standards.
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
            </div>
          )}

          {/* DOCUMENT CARDS GRID FOR REPORTS (GROUPED BY MONTH & YEAR) */}
          {selectedFolder?.id === 'task_reports' && selectedTaskFolder && (
            <div className="flex-column" style={{ gap: '16px', height: 'auto' }}>
              {selectedTaskFolder.id === 'ncr' && (
                loadingNcr ? <div>Loading NCR reports...</div> : renderGroupedReports(filteredNcrReports, 'NCR')
              )}

              {selectedTaskFolder.id === 'car' && (
                loadingCar ? <div>Loading CAR reports...</div> : renderGroupedReports(filteredCarReports, 'CAR')
              )}

              {selectedTaskFolder.id === 'qddr' && (
                loadingQddr ? <div>Loading QDDR reports...</div> : renderGroupedReports(filteredQddrReports, 'QDDR')
              )}

              {selectedTaskFolder.id === 'audit' && (
                loadingAudit ? <div>Loading Audit reports...</div> : renderGroupedReports(filteredAuditReports, 'AUDIT_RUN')
              )}

              {selectedTaskFolder.id === 'audit_schedules' && (
                loadingAuditSchedules ? <div>Loading Schedules...</div> : renderGroupedReports(filteredAuditSchedules, 'AUDIT_SCHED')
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
                <File size={48} className="preview-icon-svg" />
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
                          <td className="dcc-details-label-col">PO Ref</td>
                          <td className="dcc-details-value-col">{selectedDocument.po_reference || '—'}</td>
                        </tr>
                        <tr>
                          <td className="dcc-details-label-col">Plate No</td>
                          <td className="dcc-details-value-col">{selectedDocument.plate_number || '—'}</td>
                        </tr>
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
                {['CAR', 'NCR', 'QDDR'].includes(selectedDocument._type) && (
                  <button 
                    onClick={() => setViewDetailsDoc(selectedDocument)} 
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Eye size={13} style={{ marginRight: '6px' }} />
                    View Details
                  </button>
                )}

                {/* Open CAPA Details */}
                {selectedDocument._type === 'CAR' && (
                  <button 
                    onClick={() => onSelectCar(selectedDocument)} 
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Eye size={13} style={{ marginRight: '6px' }} />
                    View Details
                  </button>
                )}

                {/* View Checklist */}
                {selectedDocument._type === 'AUDIT_RUN' && (
                  <button 
                    onClick={() => onFetchRunDetails(selectedDocument)} 
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Eye size={13} style={{ marginRight: '6px' }} />
                    View Details
                  </button>
                )}

                {/* PDF download trigger */}
                {['CAR', 'NCR', 'QDDR'].includes(selectedDocument._type) && (
                  <button
                    onClick={() => handleDownloadPDF(selectedDocument, selectedDocument._type)}
                    className="btn btn-outline dcc-details-action-btn"
                  >
                    <Download size={13} style={{ marginRight: '6px' }} /> PDF
                  </button>
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
