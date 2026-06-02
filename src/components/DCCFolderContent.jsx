import { Folder, FileText, Search, ArrowLeft, AlertCircle } from 'lucide-react'
import SystemLogsPanel from './Panels/SystemLogsPanel.jsx'
import { supabase } from '../utils/supabase'

const TASK_REPORT_SUBFOLDERS = [
  { id: 'car', label: 'CAR' },
  { id: 'qddr', label: 'QDDR' },
  { id: 'ncr', label: 'NCR' },
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
            <table className="iso-table" style={{ width: '100%' }}>
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
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-view: Task Reports – sub-folder grid (CAR / QDDR / NCR)
// ---------------------------------------------------------------------------

function TaskReportsFolderList({ onOpenTaskFolder }) {
  return (
    <div>
      <h3 className="recently-viewed-heading">Task Reports</h3>
      <div className="folder-grid">
        {TASK_REPORT_SUBFOLDERS.map((item) => (
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
//
// Columns evidence_url and investigation_evidence_url store storage paths
// (e.g. "evidence/abc.jpg"), NOT full URLs.
// We resolve them via supabase.storage.from('ncr-evidence').getPublicUrl().
// If the value is already a full https:// URL it is used as-is.
// ---------------------------------------------------------------------------

const NCR_EVIDENCE_BUCKET = 'ncr-evidence'

function resolveStorageUrl(path) {
  if (!path) return null
  // Already a full URL — use directly
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Storage path — resolve to public URL
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
          // Non-image file (PDF etc.) — hide broken img, show plain "View" text
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
      {/* 🚀 THE FIXED WRAPPER: Contains the table width tightly inside the card margins */}
      <div className="dcc-scrollable-table-box">
        <table className="iso-table" style={{ width: '100%' }}>
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
            {ncrReports.map((ncr) => (
              <tr key={ncr.id}>
                <td style={{ fontWeight: 600 }}>
                  {ncr.reference_no ?? '—'}
                </td>
                <td>{ncr.issue_type ?? '—'}</td>
                <td>
                  <div className="clause-description">
                    {ncr.description ?? <span className="muted">No description</span>}
                  </div>
                </td>
                <td>
                  {ncr.severity ? (
                    <span
                      className={`iso-status-pill ${SEVERITY_COLORS[ncr.severity] ?? ''
                        }`}
                    >
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
                  {ncr.occurrence_date
                    ? new Date(ncr.occurrence_date).toLocaleDateString()
                    : '—'}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {ncr.created_at
                    ? new Date(ncr.created_at).toLocaleString()
                    : '—'}
                </td>
                <td style={{ width: 48, textAlign: 'center' }}>
                  <EvidenceThumbnail path={ncr.evidence_url} label="Evidence" />
                </td>
                <td style={{ width: 48, textAlign: 'center' }}>
                  <EvidenceThumbnail path={ncr.investigation_evidence_url} label="Inv. Evidence" />
                </td>
                <td>
                  <span className="iso-status-pill is-inactive">
                    {ncr.status}
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
// Main export
// ---------------------------------------------------------------------------

export default function DCCFolderContent({
  // folder state
  selectedFolder,
  onCloseFolder,

  // search
  searchQuery,
  onSearchChange,

  // recently viewed
  recentlyViewed,
  onOpenFolder,

  // folder items config
  folderItems,

  // ISO
  standards,
  loadingStandards,
  selectedStandard,
  clauses,
  loadingClauses,
  onSelectStandard,

  // Task Reports sub-folder
  selectedTaskFolder,
  onOpenTaskFolder,
  onCloseTaskFolder,

  // NCR
  ncrReports,
  loadingNcr,

  // access
  userRole,
}) {
  // ── Root view: folder browser ───────────────────────────────────────────
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
          {folderItems.map((item) => (
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
          {!recentlyViewed.length ? (
            <div className="recent-empty">No recently viewed items.</div>
          ) : (
            recentlyViewed.map((rv) => (
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

  // ── Folder view: header bar shared by all folder types ──────────────────

  // Breadcrumb label for sub-folder depth (Task Reports > NCR etc.)
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
              standards={standards}
              loadingStandards={loadingStandards}
              onSelectStandard={onSelectStandard}
            />
          ) : (
            <ISOClausesTable
              selectedStandard={selectedStandard}
              clauses={clauses}
              loadingClauses={loadingClauses}
            />
          )}
        </div>
      )}

      {/* ── Task Reports ────────────────────────────────────────────────── */}
      {selectedFolder.id === 'task_reports' && (
        <div className="row-gap-40">
          {!selectedTaskFolder ? (
            /* Level 1 – show CAR / QDDR / NCR sub-folders */
            <TaskReportsFolderList onOpenTaskFolder={onOpenTaskFolder} />
          ) : selectedTaskFolder.id === 'ncr' ? (
            /* Level 2 – NCR: closed reports table */
            <div className="flex-column full-height">
              <div className="breadcrumb">Task Reports &gt; NCR &gt; Closed</div>
              <NCRClosedTable ncrReports={ncrReports} loadingNcr={loadingNcr} />
            </div>
          ) : (
            /* Level 2 – CAR / QDDR: not yet implemented */
            <div className="empty-state">
              {selectedTaskFolder.label} reports are not yet implemented.
            </div>
          )}
        </div>
      )}
    </div>
  )
}