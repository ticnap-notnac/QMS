import { useState } from 'react'
import { Folder, FileText, Search, ArrowLeft, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import SystemLogsPanel from './Panels/SystemLogsPanel.jsx'
import { supabase } from '../utils/supabase'

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

// ---------------------------------------------------------------------------
// Sub-view: ISO Modules – standard list
// ---------------------------------------------------------------------------

function ISOStandardsList({ standards, loadingStandards, onSelectStandard }) {
  if (loadingStandards) return <div>Loading standards...</div>
  if (!standards.length) return <div className="empty-state">No active ISO standards found.</div>

  return (
    <div>
      <h3 className="recently-viewed-heading">ISO Modules</h3>
      <div className="folder-grid">
        {standards.map((s) => (
          <div
            key={s.id}
            className="folder-item folder-item-iso"
            onClick={() => onSelectStandard(s)}
          >
            <div className="folder-square-block">
              <Folder size={22} className="icon-fill-soft" />
            </div>
            <div>
              <div className="folder-item-label">
                {s.name}
                {s.version ? ` - ${s.version}` : ''}
              </div>
              <div className="recent-doc-sub">{s.clauseCount ?? 0} clauses</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: ISO Modules – clauses table
// ---------------------------------------------------------------------------

function ISOClausesTable({ selectedStandard, clauses, loadingClauses }) {
  return (
    <div className="flex-column full-height">
      <div className="row-gap-20">
        <div className="breadcrumb">
          ISO Modules &gt; {selectedStandard.name} -{' '}
          {selectedStandard.version || '-'}
        </div>

        {loadingClauses ? (
          <div>Loading clauses...</div>
        ) : !clauses.length ? (
          <div className="empty-state">No clauses found for this standard.</div>
        ) : (
          <div className="glass-card-dcc">
            <div className="dcc-scrollable-table-box">
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
                      <td style={{ width: '120px' }}>{cl.clause_number}</td>
                      <td>
                        <div>{cl.title}</div>
                        <div className="clause-description">
                          {cl.description ?? (
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
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports – sub-folder grid (CAR / QDDR / NCR)
// ---------------------------------------------------------------------------

function TaskReportsFolderList({ folders = TASK_REPORT_SUBFOLDERS, onOpenTaskFolder }) {
  return (
    <div>
      <h3 className="recently-viewed-heading">Task Reports</h3>
      <div className="folder-grid">
        {folders.map((item) => (
          <div
            key={item.id}
            className="folder-item"
            onClick={() => onOpenTaskFolder(item)}
          >
            <div className="folder-square-block">
              <Folder size={22} className="icon-fill-soft" />
            </div>
            <span className="folder-item-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports › NCR – 1×1 evidence thumbnail
// ---------------------------------------------------------------------------

const NCR_EVIDENCE_BUCKET = 'ncr-evidence'

function resolveStorageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const { data } = supabase.storage.from(NCR_EVIDENCE_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

function EvidenceThumbnail({ path, label }) {
  const publicUrl = resolveStorageUrl(path)

  if (!publicUrl) return <span className="muted">—</span>

  return (
    <a
      href={publicUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${label}`}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <img
        src={publicUrl}
        alt={label}
        style={{
          width: 36,
          height: 36,
          objectFit: 'cover',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.12)',
          cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = '0.75')}
        onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.parentElement.insertAdjacentHTML(
            'beforeend',
            `<span style="font-size:11px;opacity:0.6">View</span>`,
          )
        }}
      />
    </a>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports › NCR – closed reports table
// ---------------------------------------------------------------------------

function NCRClosedTable({ ncrReports, loadingNcr }) {
  if (loadingNcr) return <div>Loading NCR reports...</div>

  if (!ncrReports.length) {
    return (
      <div className="empty-state">
        <AlertCircle size={20} style={{ marginBottom: 6 }} />
        <div>No closed NCR reports found.</div>
      </div>
    )
  }

  return (
    <div className="glass-card-dcc">
      <div className="dcc-scrollable-table-box">
        <table className="iso-table">
          <thead>
            <tr>
              <th>Ref No.</th>
              <th>Issue Type</th>
              <th>Description</th>
              <th>Severity</th>
              <th>Department</th>
              <th>Product Type</th>
              <th>Batch No.</th>
              <th>Location</th>
              <th>Occurrence Date</th>
              <th>Created At</th>
              <th>Evidence</th>
              <th>Inv. Evidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ncrReports.map((ncr) => {
              const statusClean = String(ncr.status || '').trim().toLowerCase()

              return (
                <tr key={ncr.id}>
                  <td style={{ fontWeight: 600 }}>{ncr.reference_no ?? '—'}</td>
                  <td>{ncr.issue_type ?? '—'}</td>
                  <td>
                    <div className="clause-description">
                      {ncr.description ?? <span className="muted">No description</span>}
                    </div>
                  </td>
                  <td>
                    {ncr.severity ? (
                      <span className={`iso-status-pill ${SEVERITY_COLORS[ncr.severity] ?? ''}`}>
                        {ncr.severity}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{ncr.department_id ?? '—'}</td>
                  <td>{ncr.product_type_name ?? ncr.product_type ?? '—'}</td>
                  <td>{ncr.batch_number ?? '—'}</td>
                  <td>{ncr.location_name ?? ncr.complaint_location ?? '—'}</td>
                  <td>
                    {ncr.occurrence_date ? new Date(ncr.occurrence_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {ncr.created_at ? new Date(ncr.created_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ width: 48, textAlign: 'center' }}>
                    <EvidenceThumbnail path={ncr.evidence_url} label="Evidence" />
                  </td>
                  <td style={{ width: 48, textAlign: 'center' }}>
                    <EvidenceThumbnail path={ncr.investigation_evidence_url} label="Inv. Evidence" />
                  </td>
                  <td>
                    {/* 🚀 Dynamic Gray vs Green Theme Route Switcher */}
                    <span className={`iso-status-pill ${
                      statusClean === 'completed' ? 'is-active' : statusClean === 'closed' ? 'is-closed' : 'is-inactive'
                    }`}>
                      {ncr.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports › CAR – closed reports table
// ---------------------------------------------------------------------------

function CARClosedTable({ carReports, loadingCar, onSelectCar }) {
  const [collapsedGroups, setCollapsedGroups] = useState({})

  if (loadingCar) return <div>Loading CAR reports...</div>

  if (!carReports.length) {
    return (
      <div className="empty-state">
        <AlertCircle size={20} style={{ marginBottom: 6 }} />
        <div>No CAR reports found.</div>
      </div>
    )
  }

  // Group CARs by creation month and year in descending order
  const grouped = carReports.reduce((acc, car) => {
    const dateVal = car.created_at || car.request_date || new Date().toISOString()
    const d = new Date(dateVal)
    const monthName = d.toLocaleString('default', { month: 'long' })
    const groupKey = `${monthName} ${d.getFullYear()}`
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(car)
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped).sort((a, b) => {
    const dateA = new Date(a[1][0]?.created_at || a[1][0]?.request_date || 0)
    const dateB = new Date(b[1][0]?.created_at || b[1][0]?.request_date || 0)
    return dateB - dateA
  })

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  return (
    <div className="flex-column car-workflow-container" style={{ gap: '20px' }}>
      {sortedGroups.map(([groupKey, cars]) => {
        const isCollapsed = collapsedGroups[groupKey]
        return (
          <div key={groupKey} className="glass-card-dcc car-group-card">
            {/* Group Header */}
            <div
              onClick={() => toggleGroup(groupKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 20px',
                background: 'rgba(15, 23, 42, 0.02)',
                borderBottom: isCollapsed ? 'none' : '1px solid rgba(15, 23, 42, 0.06)',
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: 600,
                fontSize: '14px',
                color: '#334155'
              }}
            >
              {isCollapsed ? <ChevronRight size={18} color="#475569" /> : <ChevronDown size={18} color="#475569" />}
              <span>{groupKey}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  background: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  color: '#475569'
                }}
              >
                {cars.length} {cars.length === 1 ? 'CAR' : 'CARs'}
              </span>
            </div>

            {/* Group Content */}
            {!isCollapsed && (
              <div className="dcc-scrollable-table-box">
                <table className="iso-table">
                  <thead>
                    <tr>
                      <th>Ref No.</th>
                      <th>Requestor</th>
                      <th>Recipient</th>
                      <th>Requesting Dept</th>
                      <th>Responsible Dept</th>
                      <th>Product&nbsp;/<br />Material</th>
                      <th>Model&nbsp;/<br />Type</th>
                      <th>Control No.</th>
                      <th>Affected Qty</th>
                      <th>Nonconformance Details</th>
                      <th>Request Date</th>
                      <th>Resolution Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map((car) => {
                      const statusClean = String(car.status || '').trim().toLowerCase()

                      return (
                        <tr
                          key={car.id}
                          onClick={() => onSelectCar && onSelectCar(car)}
                          style={{ cursor: 'pointer' }}
                          title="Click to view details and CAPA/VoE actions"
                        >
                          <td style={{ fontWeight: 600 }}>{car.reference_no ?? '—'}</td>
                          <td>{car.requestor ?? '—'}</td>
                          <td>{car.recipient ?? '—'}</td>
                          <td>{car.requesting_department ?? '—'}</td>
                          <td>{car.responsible_department ?? '—'}</td>
                          <td>{car.product_material_name ?? '—'}</td>
                          <td>{car.model_type ?? '—'}</td>
                          <td>{car.control_no ?? '—'}</td>
                          <td>{car.affected_quantity ?? '—'}</td>
                          <td>
                            <div className="clause-description" title={car.details_of_nonconformance}>
                              {car.details_of_nonconformance ?? <span className="muted">No details</span>}
                            </div>
                          </td>
                          <td>
                            {car.request_date ? new Date(car.request_date).toLocaleDateString() : '—'}
                          </td>
                          <td>{car.resolution_time ?? '—'}</td>
                          <td>
                            <span className={`iso-status-pill ${
                              statusClean === 'closed' ? 'is-closed' : statusClean === 'under_verification' ? 'is-active' : 'is-inactive'
                            }`}>
                              {statusClean === 'under_verification' ? 'Under Verification' : statusClean === 'closed' ? 'Closed' : 'Open'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports › QDDR – closed reports table
// ---------------------------------------------------------------------------

function QDDRClosedTable({ qddrReports, loadingQddr }) {
  if (loadingQddr) return <div>Loading QDDR reports...</div>

  if (!qddrReports.length) {
    return (
      <div className="empty-state">
        <AlertCircle size={20} style={{ marginBottom: 6 }} />
        <div>No QDDR reports found.</div>
      </div>
    )
  }

  return (
    <div className="glass-card-dcc">
      <div className="dcc-scrollable-table-box">
        <table className="iso-table">
          <thead>
            <tr>
              <th>Ref No.</th>
              <th>Location</th>
              <th>Date & Time</th>
              <th>Trucker / Broker</th>
              <th>Plate No.</th>
              <th>PO Reference</th>
              <th>Material Description</th>
              <th>Material Code</th>
              <th>Qty</th>
              <th>Reason of Discrepancy</th>
              <th>Corrective Action</th>
              <th>Preventive Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {qddrReports.map((qddr) => {
              const statusClean = String(qddr.status || '').trim().toLowerCase()

              return (
                <tr key={qddr.id}>
                  <td style={{ fontWeight: 600 }}>{qddr.reference_no ?? '—'}</td>
                  <td>{qddr.location ?? '—'}</td>
                  <td>
                    {qddr.date ? new Date(qddr.date).toLocaleDateString() : '—'}
                    {qddr.time ? ` ${qddr.time.slice(0, 5)}` : ''}
                  </td>
                  <td>{qddr.trucker_broker ?? '—'}</td>
                  <td>{qddr.plate_number ?? '—'}</td>
                  <td>{qddr.po_reference ?? '—'}</td>
                  <td>{qddr.material_description ?? '—'}</td>
                  <td>{qddr.material_code ?? '—'}</td>
                  <td>{qddr.qty ?? '—'}</td>
                  <td>
                    <div className="clause-description" title={qddr.reason_of_discrepancy}>
                      {qddr.reason_of_discrepancy ?? <span className="muted">No reason</span>}
                    </div>
                  </td>
                  <td>
                    <div className="clause-description" title={qddr.corrective_action}>
                      {qddr.corrective_action ?? <span className="muted">—</span>}
                    </div>
                  </td>
                  <td>
                    <div className="clause-description" title={qddr.preventive_action}>
                      {qddr.preventive_action ?? <span className="muted">—</span>}
                    </div>
                  </td>
                  <td>
                    {/* 🚀 Dynamic Gray vs Green Theme Route Switcher */}
                    <span className={`iso-status-pill ${
                      statusClean === 'completed' ? 'is-active' : statusClean === 'closed' ? 'is-closed' : 'is-inactive'
                    }`}>
                      {qddr.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports › Audit – completed reports table
// ---------------------------------------------------------------------------

function AuditReportsTable({ auditReports, loadingAudit }) {
  if (loadingAudit) return <div>Loading Audit reports...</div>

  if (!auditReports.length) {
    return (
      <div className="empty-state">
        <AlertCircle size={20} style={{ marginBottom: 6 }} />
        <div>No completed audit reports found.</div>
      </div>
    )
  }

  return (
    <div className="glass-card-dcc">
      <div className="dcc-scrollable-table-box">
        <table className="iso-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Audit Run ID</th>
              <th>Audit Title</th>
              <th>ISO Standard</th>
              <th>Assigned Auditor</th>
              <th>Start Date / Time</th>
              <th>Completion Date / Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {auditReports.map((run) => (
              <tr key={run.id}>
                <td style={{ fontWeight: 600, fontSize: '12px' }}>
                  {run.id.slice(0, 8)}...
                </td>
                <td>{run.title}</td>
                <td>{run.standard_name}</td>
                <td>{run.auditor_name}</td>
                <td>
                  {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                </td>
                <td>
                  {run.completed_at ? new Date(run.completed_at).toLocaleString() : '—'}
                </td>
                <td>
                  {/* 🟢 Keeping "Completed" as vibrant active green */}
                  <span className="iso-status-pill is-active">
                    Completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports › Audit Schedules – scheduled list table
// ---------------------------------------------------------------------------

function AuditSchedulesTable({ auditSchedules, loadingAuditSchedules, carReports = [], onSelectCar }) {
  if (loadingAuditSchedules) return <div>Loading audit schedules...</div>

  if (!auditSchedules.length) {
    return (
      <div className="empty-state">
        <AlertCircle size={20} style={{ marginBottom: 6 }} />
        <div>No scheduled audits found.</div>
      </div>
    )
  }

  return (
    <div className="glass-card-dcc">
      <div className="dcc-scrollable-table-box">
        <table className="iso-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Schedule Title</th>
              <th>ISO Standard</th>
              <th>Assigned Auditor</th>
              <th>Scheduled Date</th>
              <th>Linked CARs</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {auditSchedules.map((schedule) => {
              const statusClean = String(schedule.status || '').trim().toLowerCase()
              const linkedCars = carReports.filter(c => c.audit_schedule_id === schedule.id)
              return (
                <tr key={schedule.id}>
                  <td style={{ fontWeight: 600 }}>{schedule.title}</td>
                  <td>{schedule.standard_name}</td>
                  <td>{schedule.auditor_name}</td>
                  <td>
                    {schedule.scheduled_date ? new Date(schedule.scheduled_date).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {linkedCars.length > 0 ? (
                        linkedCars.map(car => (
                          <span
                            key={car.id}
                            onClick={() => onSelectCar && onSelectCar(car)}
                            className="iso-status-pill is-active"
                            style={{
                              cursor: 'pointer',
                              background: 'rgba(34, 211, 238, 0.12)',
                              border: '1px solid rgba(34, 211, 238, 0.3)',
                              color: '#22d3ee',
                              fontSize: '11px',
                              padding: '2px 8px'
                            }}
                            title="Click to view CAR details"
                          >
                            {car.reference_no || `CAR #${car.id}`}
                          </span>
                        ))
                      ) : (
                        <span className="muted" style={{ fontSize: '12px' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`iso-status-pill ${
                      statusClean === 'completed' ? 'is-active' : statusClean === 'pending' ? 'is-inactive' : 'is-closed'
                    }`}>
                      {schedule.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export

// ---------------------------------------------------------------------------

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
}) {
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

  if (!selectedFolder) {
    return (
      <div className="flex-column">
        <div className="search-container-centered">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents or folders..."
            className="search-bar-field"
          />
          <Search size={16} className="search-icon-absolute" />
        </div>

        <div className="folder-grid">
          {filteredFolderItems.map((item) => (
            <div key={item.id} onClick={() => onOpenFolder(item)} className="folder-item">
              <div className="folder-square-block">
                <Folder size={22} className="icon-fill-soft" />
              </div>
              <span className="folder-item-label">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="text-left">
          <h3 className="recently-viewed-heading">Recently Viewed</h3>
          {!filteredRecentlyViewed.length ? (
            <div className="recent-empty">No recently viewed items.</div>
          ) : (
            filteredRecentlyViewed.map((rv) => (
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
            ))
          )}
        </div>
      </div>
    )
  }

  const subFolderLabel = selectedTaskFolder ? ` > ${selectedTaskFolder.label}` : ''
  const backHandler =
    selectedFolder.id === 'task_reports' && selectedTaskFolder
      ? onCloseTaskFolder
      : onCloseFolder

  return (
    <div className="flex-column full-height">
      <div className="top-row">
        <button onClick={backHandler} className="back-button">
          <ArrowLeft size={18} />
        </button>
        <div className="search-container-centered">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${selectedFolder.label}${subFolderLabel}...`}
            className="search-bar-field"
          />
          <Search size={16} className="search-icon-absolute" />
        </div>
      </div>

      {/* ── System Logs ─────────────────────────────────────────────────── */}
      {selectedFolder.id === 'system_logs' && (
        userRole === 'admin' ? (
          <div className="row-gap-40">
            <div className="glass-card-dcc system-logs-wrapper">
              <SystemLogsPanel onClose={onCloseFolder} />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            You do not have permission to view System Logs.
          </div>
        )
      )}

      {/* ── ISO Modules ─────────────────────────────────────────────────── */}
      {selectedFolder.id === 'iso_modules' && (
        <div className="row-gap-40">
          {!selectedStandard ? (
            <ISOStandardsList
              standards={filteredStandards}
              loadingStandards={loadingStandards}
              onSelectStandard={onSelectStandard}
            />
          ) : (
            <ISOClausesTable
              selectedStandard={selectedStandard}
              clauses={filteredClauses}
              loadingClauses={loadingClauses}
            />
          )}
        </div>
      )}

      {/* ── Task Reports ────────────────────────────────────────────────── */}
      {selectedFolder.id === 'task_reports' && (
        <div className="row-gap-40">
          {!selectedTaskFolder ? (
            <TaskReportsFolderList folders={filteredTaskSubfolders} onOpenTaskFolder={onOpenTaskFolder} />
          ) : selectedTaskFolder.id === 'ncr' ? (
            <div className="flex-column full-height">
              <div className="breadcrumb">Task Reports &gt; NCR &gt; Closed</div>
              <NCRClosedTable ncrReports={filteredNcrReports} loadingNcr={loadingNcr} />
            </div>
          ) : selectedTaskFolder.id === 'car' ? (
            <div className="flex-column full-height">
              <div className="breadcrumb">Task Reports &gt; CAR &gt; Workflow</div>
              <CARClosedTable carReports={filteredCarReports} loadingCar={loadingCar} onSelectCar={onSelectCar} />
            </div>

          ) : selectedTaskFolder.id === 'qddr' ? (
            <div className="flex-column full-height">
              <div className="breadcrumb">Task Reports &gt; QDDR &gt; Closed</div>
              <QDDRClosedTable qddrReports={filteredQddrReports} loadingQddr={loadingQddr} />
            </div>
          ) : selectedTaskFolder.id === 'audit' ? (
            <div className="flex-column full-height">
              <div className="breadcrumb">Task Reports &gt; Audit Reports &gt; Completed</div>
              <AuditReportsTable auditReports={filteredAuditReports} loadingAudit={loadingAudit} />
            </div>
          ) : selectedTaskFolder.id === 'audit_schedules' ? (
            <div className="flex-column full-height">
              <div className="breadcrumb">Task Reports &gt; Audit Schedules &gt; Scheduled</div>
              <AuditSchedulesTable auditSchedules={filteredAuditSchedules} loadingAuditSchedules={loadingAuditSchedules} carReports={carReports} onSelectCar={onSelectCar} />
            </div>
          ) : (
            <div className="empty-state">
              {selectedTaskFolder.label} reports are not yet implemented.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
