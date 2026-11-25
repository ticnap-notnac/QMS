import React, { useState, useEffect, useMemo } from 'react'
import { Edit2, Trash2, ChevronLeft, ChevronRight, Download, FileJson, CheckSquare, Search, X } from 'lucide-react'
import QDDRReportCard from '../Cards/QDDRReportCard.jsx'
import StarRatingAction from '../UI/StarRatingAction.jsx'
import { exportClosedQddrsToFile } from '@/services/integrationService'

export default function QDDRReportsList({
  qddrReports,
  isLoading,
  onSelectQddr,
  canEdit,
  onEditQddr,
  onDeleteQddr,
  onRateQddr,
  viewMode = 'table',
  newlySubmittedId
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  const closedQddrs = useMemo(
    () => (qddrReports || []).filter(q => String(q?.status || '').trim().toLowerCase() === 'closed'),
    [qddrReports]
  )

  const filteredQddrs = useMemo(() => {
    if (!searchQuery.trim()) return qddrReports || []
    const q = searchQuery.trim().toLowerCase()
    return (qddrReports || []).filter(qddr => {
      const ref = String(qddr.reference_no || '').toLowerCase()
      const loc = String(qddr.location || '').toLowerCase()
      const po = String(qddr.po_reference || '').toLowerCase()
      const mat = String(qddr.material_description || '').toLowerCase()
      const prodName = String(qddr.product_material_name || '').toLowerCase()
      const prodType = String(qddr.product_type_name || '').toLowerCase()
      const reason = String(qddr.reason_of_discrepancy || qddr.defect_type || '').toLowerCase()
      const desc = String(qddr.description || '').toLowerCase()
      const status = String(qddr.status || '').toLowerCase()
      const driver = String(qddr.tracker_driver || '').toLowerCase()
      const dateStr = qddr.date ? new Date(qddr.date).toLocaleDateString().toLowerCase() : ''
      const qtyStr = String(qddr.qty || '')
      return ref.includes(q) ||
        loc.includes(q) ||
        po.includes(q) ||
        mat.includes(q) ||
        prodName.includes(q) ||
        prodType.includes(q) ||
        reason.includes(q) ||
        desc.includes(q) ||
        status.includes(q) ||
        driver.includes(q) ||
        dateStr.includes(q) ||
        qtyStr === q
    })
  }, [qddrReports, searchQuery])

  useEffect(() => {
    const validClosedSet = new Set(closedQddrs.map(q => q.id))
    setSelectedIds(prev => prev.filter(id => validClosedSet.has(id)))
  }, [closedQddrs])

  const toggleSelectQddr = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const allClosedSelected = closedQddrs.length > 0 && closedQddrs.every(q => selectedIds.includes(q.id))

  const toggleSelectAllClosed = () => {
    if (allClosedSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(closedQddrs.map(q => q.id))
    }
  }

  const selectedClosedReports = useMemo(
    () => closedQddrs.filter(q => selectedIds.includes(q.id)),
    [closedQddrs, selectedIds]
  )

  const handleExportSelected = async (format = 'csv') => {
    const targetList = selectedClosedReports.length > 0 ? selectedClosedReports : closedQddrs
    if (targetList.length === 0) return
    await exportClosedQddrsToFile(targetList, format)
  }

  const renderMultiSelectExportBar = () => {
    if (closedQddrs.length === 0) return null
    const count = selectedClosedReports.length
    const totalDeductQty = (count > 0 ? selectedClosedReports : closedQddrs)
      .reduce((sum, r) => sum + (Number(r.qty) || 0), 0)

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 14px',
          marginBottom: '12px',
          background: count > 0 ? 'rgba(8, 145, 178, 0.08)' : '#f8fafc',
          border: count > 0 ? '1px solid rgba(8, 145, 178, 0.35)' : '1px solid #e2e8f0',
          borderRadius: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#1A435A',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={allClosedSelected}
              onChange={toggleSelectAllClosed}
              style={{ width: '15px', height: '15px', accentColor: '#0891b2', cursor: 'pointer' }}
            />
            Select All Closed QDDRs ({closedQddrs.length})
          </label>
          <span style={{ fontSize: '12px', color: '#475569' }}>
            {count > 0
              ? `• ${count} selected (${totalDeductQty} unit(s) for stock reduction)`
              : `• Check closed reports to export for Inventory Stock Reduction`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleExportSelected('csv')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
              background: '#0891b2',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Export selected (or all) closed QDDRs as CSV for Inventory Management stock deduction"
          >
            <Download size={14} />
            {count > 0 ? `Export Selected CSV (${count})` : `Export All Closed CSV (${closedQddrs.length})`}
          </button>

          <button
            type="button"
            onClick={() => handleExportSelected('json')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1A435A',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Export selected (or all) closed QDDRs as JSON for ERP/WMS stock deduction"
          >
            <FileJson size={14} />
            {count > 0 ? `Export JSON (${count})` : 'Export JSON'}
          </button>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((filteredQddrs?.length || 0) / itemsPerPage))
    if (currentPage > maxPage) {
      setCurrentPage(1)
    }
  }, [filteredQddrs, itemsPerPage, currentPage])

  const totalItems = filteredQddrs?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedQddrs = (filteredQddrs || []).slice(startIndex, endIndex)
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
      <div className="reports-content-container">
        {renderMultiSelectExportBar()}
        <div className="reports-list-stack">
          {paginatedQddrs.map(qddr => (
            <QDDRReportCard
              key={qddr.id}
              qddr={qddr}
              canEdit={canEdit}
              onSelectQddr={onSelectQddr}
              onEditQddr={onEditQddr}
              onDeleteQddr={onDeleteQddr}
              onRateQddr={onRateQddr}
              isNewlySubmitted={String(qddr.id) === String(newlySubmittedId)}
              isSelectedForExport={selectedIds.includes(qddr.id)}
              onToggleSelectForExport={toggleSelectQddr}
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
                <label htmlFor="qddr-feed-per-page">Per page:</label>
                <select
                  id="qddr-feed-per-page"
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
      </div>
    )
  }

  const showActionsCol = canEdit || paginatedQddrs.some(q => String(q.status || '').trim().toLowerCase() === 'closed')
  const hasClosedInList = closedQddrs.length > 0

  return (
    <div className="reports-content-container">
      {renderMultiSelectExportBar()}
      <div className="glass-card-dcc reports-list-card-container">
        <div className="reports-table-instruction-banner">
          <div className="reports-table-instruction-text">
            <span>💡 Click any row to view complete details, photos, and discrepancy actions.</span>
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
              placeholder="Search QDDR table (Ref, PO, Material...)"
              className="reports-table-search-input"
              aria-label="Search QDDR table"
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
          <table className="iso-table">
            <thead>
              <tr>
                {hasClosedInList && (
                  <th style={{ width: '36px', textAlign: 'center' }} title="Select Closed QDDRs for Inventory Export">
                    <input
                      type="checkbox"
                      checked={allClosedSelected}
                      onChange={toggleSelectAllClosed}
                      style={{ width: '15px', height: '15px', accentColor: '#0891b2', cursor: 'pointer' }}
                    />
                  </th>
                )}
                <th>Ref No.</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>PO Reference</th>
                <th>Material Description</th>
                <th className="text-center-important">Qty</th>
                <th>Status</th>
                {showActionsCol && <th className="text-center-important">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedQddrs.length === 0 ? (
                <tr>
                  <td colSpan={(hasClosedInList ? 1 : 0) + 6 + (showActionsCol ? 1 : 0)} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Search size={26} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                        No QDDR reports matching "{searchQuery}"
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
                paginatedQddrs.map((qddr) => {
                const statusClean = String(qddr.status || '').trim().toLowerCase()
                const isClosed = statusClean === 'closed'
                const isSelected = selectedIds.includes(qddr.id)
                return (
                  <tr
                    key={qddr.id}
                    id={`qddr-table-row-${qddr.id}`}
                    className={String(qddr.id) === String(newlySubmittedId) ? 'newly-submitted-table-row' : ''}
                    onClick={() => onSelectQddr && onSelectQddr(qddr)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(8, 145, 178, 0.06)' : undefined
                    }}
                    title="Click to view full details and resolve discrepancy"
                  >
                    {hasClosedInList && (
                      <td
                        style={{ textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isClosed ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectQddr(qddr.id)}
                            style={{ width: '15px', height: '15px', accentColor: '#0891b2', cursor: 'pointer' }}
                            title="Select for Inventory Stock Deduction Export"
                          />
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    )}
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
                        isClosed ? 'is-closed' : 'is-open'
                      }`}>
                        {isClosed ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    {showActionsCol && (
                      <td className="text-center-important" onClick={(e) => e.stopPropagation()}>
                        {isClosed ? (
                          <StarRatingAction
                            myRating={qddr.my_rating}
                            averageRating={qddr.average_rating}
                            ratingsCount={qddr.ratings_count}
                            onRate={(rating) => onRateQddr && onRateQddr(qddr.id, rating)}
                          />
                        ) : canEdit ? (
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
        </div>

        {/* Pagination Footer */}
        <div className="reports-table-pagination">
          <div className="reports-table-pagination-info">
            <span>
              Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> reports
              {searchQuery.trim() && (qddrReports?.length || 0) !== totalItems && (
                <span style={{ color: '#0891b2', marginLeft: '6px', fontWeight: 500, fontSize: '12px' }}>
                  (filtered from {qddrReports?.length || 0})
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
    </div>
  )
}
