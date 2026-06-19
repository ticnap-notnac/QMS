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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 20px', width: '100%' }}>
        <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>No QDDR reports found.</span>
      </div>
    )
  }

  return (
    <div className="glass-card-dcc" style={{ padding: '20px' }}>
      {/* 🚀 Fluid Full-Width Scroll Wrapper Shield */}
      <div className="reports-table-scroll-wrap">
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
                <tr
                  key={qddr.id}
                  onClick={() => onSelectQddr && onSelectQddr(qddr)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view details and resolve discrepancy"
                >
                  <td style={{ fontWeight: 600 }}>{qddr.reference_no ?? '—'}</td>
                  
                  {/* 🎯 Content Optimization: Spacing out text fields natively with text-cell hooks */}
                  <td><div className="table-text-cell">{qddr.location ?? '—'}</div></td>
                  <td>
                    <div className="table-text-cell" style={{ whiteSpace: 'nowrap' }}>
                      {qddr.date ? new Date(qddr.date).toLocaleDateString() : '—'}
                      {qddr.time ? ` ${qddr.time.slice(0, 5)}` : ''}
                    </div>
                  </td>
                  <td><div className="table-text-cell">{qddr.trucker_broker ?? '—'}</div></td>
                  <td><div className="table-text-cell">{qddr.plate_number ?? '—'}</div></td>
                  <td><div className="table-text-cell">{qddr.po_reference ?? '—'}</div></td>
                  <td><div className="table-text-cell">{qddr.material_description ?? '—'}</div></td>
                  <td><div className="table-text-cell">{qddr.material_code ?? '—'}</div></td>
                  <td><div className="table-text-cell" style={{ fontWeight: 600 }}>{qddr.qty ?? '—'}</div></td>
                  
                  {/* 📋 Description Text Columns — Protected by Width-Limiting & Line Wrapping Rules */}
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