import { useState, useRef, useEffect } from 'react'
import { Folder, FileText, Search, ArrowLeft, AlertCircle, ChevronDown, ChevronRight, Download, Terminal, ShieldAlert, Share2, Settings, File, Eye } from 'lucide-react'
import SystemLogsPanel from './Panels/SystemLogsPanel.jsx'
import { supabase } from '../utils/supabase'
import html2pdf from 'html2pdf.js'
import CARPrintTemplate from './Print/CARPrintTemplate.jsx'
import NCRPrintTemplate from './Print/NCRPrintTemplate.jsx'
import QDDRPrintTemplate from './Print/QDDRPrintTemplate.jsx'

const TASK_REPORT_SUBFOLDERS = [
  { id: 'car', label: 'CAR' },
  { id: 'qddr', label: 'QDDR' },
  { id: 'ncr', label: 'NCR' },
  { id: 'audit', label: 'Audit Reports' },
  { id: 'audit_schedules', label: 'Audit Schedules' },
]

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
  const [selectedDocument, setSelectedDocument] = useState(null)
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
    cl.clause_number.toLowerCase().includes(queryClean) ||
    cl.title.toLowerCase().includes(queryClean) ||
    (cl.description && cl.description.toLowerCase().includes(queryClean))
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
    selectedFolder?.id === 'task_reports' && selectedTaskFolder
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
            <button onClick={backHandler} className="back-button-mini">
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
            userRole === 'admin' ? (
              <SystemLogsPanel onClose={onCloseFolder} searchQuery={searchQuery} />
            ) : (
              <div className="empty-state">
                <ShieldAlert size={40} style={{ marginBottom: '12px', color: '#dc2626' }} />
                <p>You do not have permission to view System Logs.</p>
              </div>
            )
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

          {/* DOCUMENT CARDS GRID FOR REPORTS */}
          {selectedFolder?.id === 'task_reports' && selectedTaskFolder && (
            <div className="flex-column full-height" style={{ gap: '16px' }}>
              {selectedTaskFolder.id === 'ncr' && (
                loadingNcr ? <div>Loading NCR reports...</div> :
                !filteredNcrReports.length ? <div className="empty-state">No NCR reports found.</div> : (
                  <div className="dcc-document-grid">
                    {filteredNcrReports.map((ncr) => (
                      <div
                        key={ncr.id}
                        className={`dcc-document-card ${selectedDocument?.id === ncr.id ? 'active' : ''}`}
                        onClick={() => setSelectedDocument({ ...ncr, _type: 'NCR' })}
                      >
                        <div className="document-card-icon-wrap doc">
                          <FileText size={24} />
                        </div>
                        <span className="document-card-label">{ncr.reference_no || `NCR-${ncr.id.slice(0,6)}`}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {selectedTaskFolder.id === 'car' && (
                loadingCar ? <div>Loading CAR reports...</div> :
                !filteredCarReports.length ? <div className="empty-state">No CAR reports found.</div> : (
                  <div className="dcc-document-grid">
                    {filteredCarReports.map((car) => (
                      <div
                        key={car.id}
                        className={`dcc-document-card ${selectedDocument?.id === car.id ? 'active' : ''}`}
                        onClick={() => setSelectedDocument({ ...car, _type: 'CAR' })}
                      >
                        <div className="document-card-icon-wrap doc">
                          <FileText size={24} />
                        </div>
                        <span className="document-card-label">{car.reference_no || `CAR-${car.id.slice(0,6)}`}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {selectedTaskFolder.id === 'qddr' && (
                loadingQddr ? <div>Loading QDDR reports...</div> :
                !filteredQddrReports.length ? <div className="empty-state">No QDDR reports found.</div> : (
                  <div className="dcc-document-grid">
                    {filteredQddrReports.map((q) => (
                      <div
                        key={q.id}
                        className={`dcc-document-card ${selectedDocument?.id === q.id ? 'active' : ''}`}
                        onClick={() => setSelectedDocument({ ...q, _type: 'QDDR' })}
                      >
                        <div className="document-card-icon-wrap doc">
                          <FileText size={24} />
                        </div>
                        <span className="document-card-label">{q.reference_no || `QDDR-${q.id.slice(0,6)}`}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {selectedTaskFolder.id === 'audit' && (
                loadingAudit ? <div>Loading Audit reports...</div> :
                !filteredAuditReports.length ? <div className="empty-state">No Completed Audit reports found.</div> : (
                  <div className="dcc-document-grid">
                    {filteredAuditReports.map((audit) => (
                      <div
                        key={audit.id}
                        className={`dcc-document-card ${selectedDocument?.id === audit.id ? 'active' : ''}`}
                        onClick={() => setSelectedDocument({ ...audit, _type: 'AUDIT_RUN' })}
                      >
                        <div className="document-card-icon-wrap doc">
                          <FileText size={24} />
                        </div>
                        <span className="document-card-label">{audit.title || `Audit-${audit.id.slice(0,6)}`}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {selectedTaskFolder.id === 'audit_schedules' && (
                loadingAuditSchedules ? <div>Loading Schedules...</div> :
                !filteredAuditSchedules.length ? <div className="empty-state">No Scheduled Audits found.</div> : (
                  <div className="dcc-document-grid">
                    {filteredAuditSchedules.map((sched) => (
                      <div
                        key={sched.id}
                        className={`dcc-document-card ${selectedDocument?.id === sched.id ? 'active' : ''}`}
                        onClick={() => setSelectedDocument({ ...sched, _type: 'AUDIT_SCHED' })}
                      >
                        <div className="document-card-icon-wrap doc">
                          <FileText size={24} />
                        </div>
                        <span className="document-card-label">{sched.title || `Sched-${sched.id.slice(0,6)}`}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── COLUMN 3: RIGHT DETAILS PANE (CONDITIONAL) ────────────────────── */}
      {selectedFolder && selectedDocument && (
        <div className="dcc-right-pane">
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
                    {selectedDocument.status || 'Active'}
                  </span>
                </div>

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

function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null

  const isLong = text.length > 250
  
  // Clean up single newlines from PDF copy-paste (replace with space) but keep double newlines
  let cleanText = text.replace(/([^\n])\n([^\n])/g, '$1 $2')
  
  // Simple parsing to add line breaks before "Note X to entry:" or similar bullet points if they exist
  const formattedText = cleanText.replace(/(Note \d+ to entry:)/g, '\n\n$1')

  if (!isLong) {
    return <div style={{ whiteSpace: 'pre-line' }}>{formattedText}</div>
  }

  return (
    <div>
      <div style={
        expanded 
          ? { whiteSpace: 'pre-line' } 
          : {
              whiteSpace: 'pre-line',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }
      }>
        {formattedText}
      </div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          cursor: 'pointer',
          padding: '4px 0 0 0',
          marginTop: '4px',
          fontWeight: 500,
          fontSize: '13px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {expanded ? 'Show Less' : 'Read More'}
      </button>
    </div>
  )
}

function ISOClausesTable({ selectedStandard, clauses, loadingClauses }) {
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
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{cl.title}</div>
                  <div className="clause-description">
                    {cl.description ? (
                      <ExpandableText text={cl.description} />
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