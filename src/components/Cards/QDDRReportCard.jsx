import { User, SquarePen, Trash2 } from 'lucide-react'

function QDDRReportCard({ qddr, canEdit, onSelectQddr, onEditQddr, onDeleteQddr }) {
  const statusClean = String(qddr.status || '').trim().toLowerCase()
  const isClosed = statusClean === 'closed'
  const isUnderVerification = statusClean === 'under_verification'

  let statusBg = '#f1f5f9'
  let statusColor = '#475569'
  let statusBorder = '1px solid #cbd5e1'
  let statusText = 'OPEN'

  if (isClosed) {
    statusBg = '#f0fdf4'
    statusColor = '#166534'
    statusBorder = '1px solid #bbf7d0'
    statusText = 'CLOSED'
  } else if (isUnderVerification) {
    statusBg = '#eff6ff'
    statusColor = '#1e40af'
    statusBorder = '1px solid #bfdbfe'
    statusText = 'UNDER VERIFICATION'
  } else {
    statusBg = '#fef2f2'
    statusColor = '#991b1b'
    statusBorder = '1px solid #fecaca'
    statusText = 'OPEN'
  }

  const unifiedBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '95px',
    height: '28px',
    padding: '0 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textAlign: 'center',
    boxSizing: 'border-box'
  }

  const dateTimeStr = qddr.date 
    ? `${new Date(qddr.date).toLocaleDateString()}${qddr.time ? ` ${qddr.time.slice(0, 5)}` : ''}`
    : '—'

  return (
    <div className="reports-card" id={`qddr-report-card-${qddr.id}`} onClick={() => onSelectQddr && onSelectQddr(qddr)} style={{ cursor: onSelectQddr ? 'pointer' : 'default' }}>
      {/* Header */}
      <div className="reports-card-header">
        <div className="reports-user-block">
          <div className="reports-avatar">
            <User size={20} color="#0f172a" />
          </div>
          <div className="reports-user-text">
            <span className="reports-user-name">
              {qddr.reference_no?.trim() || `QDDR-${qddr.id}`}
            </span>
            <span className="reports-user-meta">
              {qddr.location?.trim() || '—'} • {dateTimeStr}
            </span>
          </div>
        </div>
        <div className="badges-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ ...unifiedBadgeStyle, background: statusBg, color: statusColor, border: statusBorder }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Details Section */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Details</h4>
      </div>
      
      <div className="reports-grid-2-col">
        <div>
          <div className="reports-label-small">Trucker / Broker</div>
          <div className="reports-value-text">{qddr.trucker_broker?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Plate No.</div>
          <div className="reports-value-text">{qddr.plate_number?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">PO Reference</div>
          <div className="reports-value-text">{qddr.po_reference?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Material Code</div>
          <div className="reports-value-text">{qddr.material_code?.trim() || '—'}</div>
        </div>
        <div className="grid-col-span-2">
          <div className="reports-label-small">Material Description</div>
          <div className="reports-value-text">{qddr.material_description?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Qty</div>
          <div className="reports-value-text">{String(qddr.qty ?? '').trim() || '—'}</div>
        </div>
      </div>

      <div className="reports-section-label">
        <div className="reports-label-small">Reason of Discrepancy</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {qddr.reason_of_discrepancy || 'No details provided.'}
        </span>
      </div>

      <div className="reports-section-label">
        <div className="reports-label-small">Corrective Action</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {qddr.corrective_action || 'No details provided.'}
        </span>
      </div>

      <div className="reports-section-label">
        <div className="reports-label-small">Preventive Action</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {qddr.preventive_action || 'No details provided.'}
        </span>
      </div>

      {/* Action row */}
      {canEdit && (
        <div className="action-btn-row" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn-action-icon"
            onClick={() => onEditQddr && onEditQddr(qddr)}
            title="Edit report"
          >
            <SquarePen size={16} />
          </button>
          <button
            type="button"
            className="btn-action-icon-danger"
            onClick={() => onDeleteQddr && onDeleteQddr(qddr.id)}
            title="Delete report"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default QDDRReportCard
