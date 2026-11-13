import { Edit2, Trash2 } from 'lucide-react'
import CARReportCard from '../Cards/CARReportCard.jsx'

export default function CARReportsList({
  carReports,
  isLoading,
  onSelectCar,
  canEdit,
  onEditCar,
  onDeleteCar,
  viewMode = 'feed'
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
      <div className="empty-state-container">
        <span className="empty-state-text">No CAR reports found.</span>
      </div>
    )
  }

  return (
    <div className="reports-content-container">
      {viewMode === 'feed' ? (
        <div className="reports-list-stack">
          {carReports.map((car) => (
            <CARReportCard
              key={`car-${car.id}`}
              car={car}
              canEdit={canEdit}
              onSelectCar={onSelectCar}
              onEditCar={onEditCar}
              onDeleteCar={onDeleteCar}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card-dcc reports-list-card-container">
          <div className="reports-table-instruction-banner">
            <span>💡 Click any row to view complete details, root causes, and CAPA actions.</span>
          </div>
          <div className="reports-table-scroll-wrap">
            <table className="iso-table">
              <thead>
                <tr>
                  <th>Ref No.</th>
                  <th>Date</th>
                  <th>Issue Type</th>
                  <th>Responsible Dept</th>
                  <th>Product / Material</th>
                  <th>Status</th>
                  {canEdit && <th className="text-center-important">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {carReports.map((car) => {
                  const statusClean = String(car.status || '').trim().toLowerCase()
                  const issueTypeStr = car.type_of_nonconformance || car.others || '—'

                  return (
                    <tr
                      key={car.id}
                      onClick={() => onSelectCar && onSelectCar(car)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view full details and CAPA actions"
                    >
                      <td style={{ fontWeight: 600 }}>{car.reference_no?.trim() || '—'}</td>
                      <td>
                        <div className="table-text-cell" style={{ whiteSpace: 'nowrap' }}>
                          {car.request_date ? new Date(car.request_date).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td>
                        <div className="table-text-cell" title={issueTypeStr}>
                          {issueTypeStr}
                        </div>
                      </td>
                      <td>
                        <div className="table-text-cell" title={car.responsible_department?.trim() || '—'}>
                          {car.responsible_department?.trim() || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="table-text-cell" title={car.product_material_name?.trim() || '—'}>
                          {car.product_material_name?.trim() || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`iso-status-pill ${
                          statusClean === 'closed' ? 'is-closed' : statusClean === 'under_verification' ? 'is-active' : 'is-open'
                        }`}>
                          {statusClean === 'under_verification' ? 'Under Verification' : statusClean === 'closed' ? 'Closed' : 'Open'}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="text-center-important" onClick={(e) => e.stopPropagation()}>
                          <div className="action-btn-row" style={{ marginTop: 0 }}>
                            <button
                              className="btn-action-icon"
                              title="Edit Report"
                              onClick={() => onEditCar && onEditCar(car)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn-action-icon-danger"
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
      )}
    </div>
  )
}
