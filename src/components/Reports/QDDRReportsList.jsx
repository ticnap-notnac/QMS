import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((qddrReports?.length || 0) / itemsPerPage))
    if (currentPage > maxPage) {
      setCurrentPage(1)
    }
  }, [qddrReports, itemsPerPage, currentPage])

  const totalItems = qddrReports?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedQddrs = (qddrReports || []).slice(startIndex, endIndex)
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
              {paginatedQddrs.map((qddr) => {
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
    </div>
  )
}
