import { Edit2, Trash2 } from 'lucide-react'

export default function CARReportsList({
  carReports,
  isLoading,
  onSelectCar,
  canEdit,
  onEditCar,
  onDeleteCar
}) {
  if (isLoading) {
    return (
      <div className="reports-card">
        <div className="glass-card-subtext">Loading CAR reports...</div>
      </div>
    )
  }

  if (!carReports || carReports.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 20px', width: '100%' }}>
        <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>No CAR reports found.</span>
      </div>
    )
  }

  return (
    <div className="glass-card-dcc" style={{ padding: '20px' }}>
      {/* 🎯 THE FIX: Changed from dcc-scrollable-table-box to harness your reports width parameters */}
      <div className="reports-table-scroll-wrap">
        <table className="iso-table">
          <thead>
            <tr>
              <th>Ref No.</th>
              <th>Issue Type</th>
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
              <th className="text-center-important">Resolution Time</th>
              <th>Status</th>
              {canEdit && <th className="text-center-important">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {carReports.map((car) => {
              const statusClean = String(car.status || '').trim().toLowerCase()
              const issueTypes = []
              if (car.quality_food_safety) issueTypes.push('Quality/Food Safety')
              if (car.environment_health_safety) issueTypes.push('EHS')
              if (car.security_issue) issueTypes.push('Security')
              if (car.internal_audit) issueTypes.push('Internal Audit')
              if (car.customer_complaint) issueTypes.push('Customer Complaint')
              if (car.government_agency_audit) issueTypes.push('Gov Audit')
              if (car.customer_audit_nonconformance) issueTypes.push('Customer Audit')
              if (car.vendor_nonconformance) issueTypes.push('Vendor')
              if (car.others) issueTypes.push(`Others: ${car.others}`)
              const issueTypeStr = issueTypes.join(', ') || '—'

              return (
                <tr
                  key={car.id}
                  onClick={() => onSelectCar && onSelectCar(car)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view details and CAPA/VoE actions"
                >
                  <td style={{ fontWeight: 600 }}>{car.reference_no ?? '—'}</td>
                  <td>{issueTypeStr}</td>
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
                  <td className="text-center-important">{car.resolution_time ?? '—'}</td>
                  <td>
                    <span className={`iso-status-pill ${
                      statusClean === 'closed' ? 'is-closed' : statusClean === 'under_verification' ? 'is-active' : 'is-open'
                    }`}>
                      {statusClean === 'under_verification' ? 'Under Verification' : statusClean === 'closed' ? 'Closed' : 'Open'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="text-center-important" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn-icon"
                          style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Edit Report"
                          onClick={() => onEditCar && onEditCar(car)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Delete Report"
                          onClick={() => onDeleteCar && onDeleteCar(car.id)}
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
  )
}