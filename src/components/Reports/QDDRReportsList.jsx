import React from 'react'

export default function QDDRReportsList({
  qddrReports,
  isLoading,
  onSelectQddr
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
      <div className="reports-card">
        <div className="reports-workspace">
          <span className="reports-workspace-text">No QDDR reports found.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card-dcc" style={{ padding: '20px' }}>
      <div className="dcc-scrollable-table-box">
        <table className="iso-table" style={{ width: '100%' }}>
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
                <tr
                  key={qddr.id}
                  onClick={() => onSelectQddr && onSelectQddr(qddr)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view details and resolve discrepancy"
                >
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
                    <span className={`iso-status-pill ${
                      statusClean === 'closed' ? 'is-closed' : 'is-inactive'
                    }`}>
                      {statusClean === 'closed' ? 'Closed' : 'Open'}
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
