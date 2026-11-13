import React from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import QDDRReportCard from '../Cards/QDDRReportCard.jsx'

export default function QDDRReportsList({
  qddrReports,
  isLoading,
  onSelectQddr,
  canEdit,
  onEditQddr,
  onDeleteQddr,
  viewMode = 'table'
}) {
  if (isLoading) {
    return (
      <div className="reports-card">
        <div className="glass-card-subtext">Loading QDDR reports...</div>
      </div>
    )
  }

  if (!qddrReports || qddrReports.length === 0) {
    return (
      <div className="empty-state-container">
        <span className="empty-state-text">No QDDR reports found.</span>
      </div>
    )
  }

  if (viewMode === 'feed') {
    return (
      <div className="reports-feed-list" style={{ marginTop: '24px' }}>
        {qddrReports.map(qddr => (
          <QDDRReportCard
            key={qddr.id}
            qddr={qddr}
            canEdit={canEdit}
            onSelectQddr={onSelectQddr}
            onEditQddr={onEditQddr}
            onDeleteQddr={onDeleteQddr}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="reports-content-container">
      <div className="glass-card-dcc reports-list-card-container">
        <div className="reports-table-instruction-banner">
          <span>💡 Click any row to view complete details, photos, and discrepancy actions.</span>
        </div>
        <div className="reports-table-scroll-wrap">
          <table className="iso-table">
            <thead>
              <tr>
                <th>Ref No.</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>PO Reference</th>
                <th>Material Description</th>
                <th className="text-center-important">Qty</th>
                <th>Status</th>
                {canEdit && <th className="text-center-important">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {qddrReports.map((qddr) => {
                const statusClean = String(qddr.status || '').trim().toLowerCase()
                return (
                  <tr
                    key={qddr.id}
                    onClick={() => onSelectQddr && onSelectQddr(qddr)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full details and resolve discrepancy"
                  >
                    <td style={{ fontWeight: 600 }}>{qddr.reference_no ?? '—'}</td>
                    <td>
                      <div className="table-text-cell" style={{ whiteSpace: 'nowrap' }}>
                        {qddr.date ? new Date(qddr.date).toLocaleDateString() : '—'}
                        {qddr.time ? ` ${qddr.time.slice(0, 5)}` : ''}
                      </div>
                    </td>
                    <td><div className="table-text-cell" title={qddr.location ?? '—'}>{qddr.location ?? '—'}</div></td>
                    <td><div className="table-text-cell" title={qddr.po_reference ?? '—'}>{qddr.po_reference ?? '—'}</div></td>
                    <td><div className="table-text-cell" title={qddr.material_description ?? '—'}>{qddr.material_description ?? '—'}</div></td>
                    <td className="text-center-important">
                      <div className="table-text-cell" style={{ fontWeight: 600, justifyContent: 'center' }}>
                        {qddr.qty ?? '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`iso-status-pill ${
                        statusClean === 'closed' ? 'is-closed' : 'is-open'
                      }`}>
                        {statusClean === 'closed' ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="text-center-important" onClick={(e) => e.stopPropagation()}>
                        <div className="action-btn-row" style={{ marginTop: 0 }}>
                          <button
                            className="btn-action-icon"
                            title="Edit Report"
                            onClick={() => onEditQddr && onEditQddr(qddr)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-action-icon-danger"
                            title="Delete Report"
                            onClick={() => onDeleteQddr && onDeleteQddr(qddr.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
