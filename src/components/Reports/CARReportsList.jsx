import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((carReports?.length || 0) / itemsPerPage))
    if (currentPage > maxPage) {
      setCurrentPage(1)
    }
  }, [carReports, itemsPerPage, currentPage])

  const totalItems = carReports?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedCars = (carReports || []).slice(startIndex, endIndex)

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
                {paginatedCars.map((car) => {
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

          {/* Pagination Footer */}
          <div className="reports-table-pagination">
            <div className="reports-table-pagination-info">
              <span>
                Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> reports
              </span>
              <div className="reports-table-rows-select">
                <span>Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="pagination-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="reports-table-pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div className="pagination-pages-group">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 7) return true
                    if (page === 1 || page === totalPages) return true
                    return Math.abs(page - currentPage) <= 1
                  })
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1]
                    const showEllipsis = prevPage && page - prevPage > 1

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="pagination-ellipsis">...</span>}
                        <button
                          type="button"
                          className={`pagination-page-btn ${page === currentPage ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    )
                  })}
              </div>

              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalItems === 0}
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
