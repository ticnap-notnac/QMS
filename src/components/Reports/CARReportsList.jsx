import React, { useState, useEffect, useMemo } from 'react'
import { Edit2, Trash2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import CARReportCard from '../Cards/CARReportCard.jsx'
import StarRatingAction from '../UI/StarRatingAction.jsx'

export default function CARReportsList({
  carReports,
  isLoading,
  onSelectCar,
  canEdit,
  onEditCar,
  onDeleteCar,
  onRateCar,
  viewMode = 'feed',
  newlySubmittedId
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCars = useMemo(() => {
    if (!searchQuery.trim()) return carReports || []
    const q = searchQuery.trim().toLowerCase()
    return (carReports || []).filter(car => {
      const ref = String(car.reference_no || '').toLowerCase()
      const issue = String(car.type_of_nonconformance || car.others || '').toLowerCase()
      const dept = String(car.responsible_department || '').toLowerCase()
      const material = String(car.product_material_name || '').toLowerCase()
      const prodType = String(car.product_type_name || '').toLowerCase()
      const status = String(car.status || '').toLowerCase()
      const details = String(car.details_of_nonconformance || '').toLowerCase()
      const req = String(car.requestor || '').toLowerCase()
      const dateStr = car.request_date ? new Date(car.request_date).toLocaleDateString().toLowerCase() : ''
      return ref.includes(q) ||
        issue.includes(q) ||
        dept.includes(q) ||
        material.includes(q) ||
        prodType.includes(q) ||
        status.includes(q) ||
        details.includes(q) ||
        req.includes(q) ||
        dateStr.includes(q)
    })
  }, [carReports, searchQuery])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((filteredCars?.length || 0) / itemsPerPage))
    if (currentPage > maxPage) {
      setCurrentPage(1)
    }
  }, [filteredCars, itemsPerPage, currentPage])

  const totalItems = filteredCars?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedCars = (filteredCars || []).slice(startIndex, endIndex)

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
        <>
          <div className="reports-list-stack">
            {paginatedCars.map((car) => (
              <CARReportCard
                key={`car-${car.id}`}
                car={car}
                canEdit={canEdit}
                onSelectCar={onSelectCar}
                onEditCar={onEditCar}
                onDeleteCar={onDeleteCar}
                onRateCar={onRateCar}
                isNewlySubmitted={String(car.id) === String(newlySubmittedId)}
              />
            ))}
          </div>

          {totalItems > itemsPerPage && (
            <div className="reports-feed-pagination">
              <div className="reports-feed-pagination-info">
                <span>
                  Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> reports
                </span>
                <div className="reports-feed-per-page">
                  <label htmlFor="car-feed-per-page">Per page:</label>
                  <select
                    id="car-feed-per-page"
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
          )}
        </>
      ) : (
        <div className="glass-card-dcc reports-list-card-container">
          <div className="reports-table-instruction-banner">
            <div className="reports-table-instruction-text">
              <span>💡 Click any row to view complete details, root causes, and CAPA actions.</span>
            </div>
            <div className="reports-table-search-box">
              <Search size={15} className="reports-table-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search CAR table (Ref, Dept, Product...)"
                className="reports-table-search-input"
                aria-label="Search CAR table"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  className="reports-table-search-clear"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="reports-table-scroll-wrap">
            {(() => {
              const showActionsCol = canEdit || paginatedCars.some(c => String(c.status || '').trim().toLowerCase() === 'closed')
              return (
                <table className="iso-table">
                  <thead>
                    <tr>
                      <th>Ref No.</th>
                      <th>Date</th>
                      <th>Issue Type</th>
                      <th>Responsible Dept</th>
                      <th>Product / Material</th>
                      <th>Status</th>
                      {showActionsCol && <th className="text-center-important">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCars.length === 0 ? (
                      <tr>
                        <td colSpan={showActionsCol ? 7 : 6} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Search size={26} style={{ color: '#94a3b8' }} />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                              No CAR reports matching "{searchQuery}"
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('')
                                setCurrentPage(1)
                              }}
                              style={{
                                marginTop: '4px',
                                fontSize: '12px',
                                color: '#0891b2',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontWeight: 600
                              }}
                            >
                              Clear search
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedCars.map((car) => {
                        const statusClean = String(car.status || '').trim().toLowerCase()
                        const isClosed = statusClean === 'closed'
                        const issueTypeStr = car.type_of_nonconformance || car.others || '—'

                        return (
                          <tr
                            key={car.id}
                            id={`car-table-row-${car.id}`}
                            className={String(car.id) === String(newlySubmittedId) ? 'newly-submitted-table-row' : ''}
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
                              <span className={`iso-status-pill ${isClosed ? 'is-closed' : statusClean === 'under_verification' ? 'is-active' : 'is-open'
                                }`}>
                                {statusClean === 'under_verification' ? 'Under Verification' : isClosed ? 'Closed' : 'Open'}
                              </span>
                            </td>
                            {showActionsCol && (
                              <td className="text-center-important" onClick={(e) => e.stopPropagation()}>
                                {isClosed ? (
                                  <StarRatingAction
                                    myRating={car.my_rating}
                                    averageRating={car.average_rating}
                                    ratingsCount={car.ratings_count}
                                    onRate={(rating) => onRateCar && onRateCar(car.id, rating)}
                                  />
                                ) : canEdit ? (
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
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      }))}
                  </tbody>
                </table>
              )
            })()}
          </div>

          {/* Pagination Footer */}
          <div className="reports-table-pagination">
            <div className="reports-table-pagination-info">
              <span>
                Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> reports
                {searchQuery.trim() && (carReports?.length || 0) !== totalItems && (
                  <span style={{ color: '#0891b2', marginLeft: '6px', fontWeight: 500, fontSize: '12px' }}>
                    (filtered from {carReports?.length || 0})
                  </span>
                )}
              </span>
              <div className="reports-feed-per-page">
                <label>Per page:</label>
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
