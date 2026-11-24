import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CARReportCard from '../Cards/CARReportCard.jsx'
import QDDRReportCard from '../Cards/QDDRReportCard.jsx'
import CARReportsList from './CARReportsList.jsx'
import QDDRReportsList from './QDDRReportsList.jsx'

export default function MyReportsList({
  carReports = [],
  qddrReports = [],
  isLoading = false,
  viewMode = 'feed',
  canEdit = false,
  onSelectCar,
  onSelectQddr,
  onEditCar,
  onEditQddr,
  onDeleteCar,
  onDeleteQddr,
  onRateCar,
  onRateQddr,
  newlySubmittedReport = null
}) {
  const [subTab, setSubTab] = useState('all') // 'all' | 'car' | 'qddr'
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const totalCount = carReports.length + qddrReports.length

  // Combined and sorted list for "all" feed view
  const combinedReports = useMemo(() => {
    const list = [
      ...carReports.map(c => ({
        ...c,
        _reportType: 'car',
        _sortTime: new Date(c.created_at || c.request_date || c.date || 0).getTime()
      })),
      ...qddrReports.map(q => ({
        ...q,
        _reportType: 'qddr',
        _sortTime: new Date(q.created_at || q.date ? `${q.date}T${q.time || '00:00:00'}` : 0).getTime()
      }))
    ]
    return list.sort((a, b) => b._sortTime - a._sortTime)
  }, [carReports, qddrReports])

  useEffect(() => {
    const totalItems = subTab === 'all' ? combinedReports.length : subTab === 'car' ? carReports.length : qddrReports.length
    const maxPage = Math.max(1, Math.ceil(totalItems / itemsPerPage))
    if (currentPage > maxPage) {
      setCurrentPage(1)
    }
  }, [subTab, combinedReports.length, carReports.length, qddrReports.length, itemsPerPage, currentPage])

  const paginatedCombined = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return combinedReports.slice(startIndex, startIndex + itemsPerPage)
  }, [combinedReports, currentPage, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(combinedReports.length / itemsPerPage))

  if (isLoading) {
    return (
      <div className="reports-card">
        <div className="glass-card-subtext">Loading your submitted reports...</div>
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="empty-state-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <span className="empty-state-text" style={{ fontSize: '15px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
          No submitted reports found.
        </span>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          You have not submitted any Corrective Actions (CAR) or Defects & Disposal (QDDR) reports yet.
        </p>
      </div>
    )
  }

  return (
    <div className="reports-content-container">
      {/* Sub-tab pills for switching between All, CAR, and QDDR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={`btn-quick-toggle ${subTab === 'all' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('all')
              setCurrentPage(1)
            }}
          >
            All Submitted ({totalCount})
          </button>
          <button
            type="button"
            className={`btn-quick-toggle ${subTab === 'car' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('car')
              setCurrentPage(1)
            }}
          >
            CAR ({carReports.length})
          </button>
          <button
            type="button"
            className={`btn-quick-toggle ${subTab === 'qddr' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('qddr')
              setCurrentPage(1)
            }}
          >
            QDDR ({qddrReports.length})
          </button>
        </div>
        <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
          {subTab === 'all' && `Showing ${totalCount} report${totalCount === 1 ? '' : 's'}`}
          {subTab === 'car' && `Showing ${carReports.length} CAR report${carReports.length === 1 ? '' : 's'}`}
          {subTab === 'qddr' && `Showing ${qddrReports.length} QDDR report${qddrReports.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {/* Render CAR only view */}
      {subTab === 'car' && (
        <CARReportsList
          carReports={carReports}
          isLoading={false}
          onSelectCar={onSelectCar}
          canEdit={canEdit}
          onEditCar={onEditCar}
          onDeleteCar={onDeleteCar}
          onRateCar={onRateCar}
          viewMode={viewMode}
          newlySubmittedId={newlySubmittedReport?.type === 'car' ? newlySubmittedReport?.id : null}
        />
      )}

      {/* Render QDDR only view */}
      {subTab === 'qddr' && (
        <QDDRReportsList
          qddrReports={qddrReports}
          isLoading={false}
          onSelectQddr={onSelectQddr}
          canEdit={canEdit}
          onEditQddr={onEditQddr}
          onDeleteQddr={onDeleteQddr}
          onRateQddr={onRateQddr}
          viewMode={viewMode}
          newlySubmittedId={newlySubmittedReport?.type === 'qddr' ? newlySubmittedReport?.id : null}
        />
      )}

      {/* Render combined "All" view */}
      {subTab === 'all' && viewMode === 'feed' && (
        <>
          <div className="reports-card-feed" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {paginatedCombined.map(item => {
              if (item._reportType === 'car') {
                return (
                  <CARReportCard
                    key={`my-car-${item.id}`}
                    car={item}
                    canEdit={canEdit}
                    onSelectCar={onSelectCar}
                    onEditCar={onEditCar}
                    onDeleteCar={onDeleteCar}
                    onRateCar={onRateCar}
                    isNewlySubmitted={newlySubmittedReport?.type === 'car' && Number(newlySubmittedReport?.id) === Number(item.id)}
                  />
                )
              }
              return (
                <QDDRReportCard
                  key={`my-qddr-${item.id}`}
                  qddr={item}
                  canEdit={canEdit}
                  onSelectQddr={onSelectQddr}
                  onEditQddr={onEditQddr}
                  onDeleteQddr={onDeleteQddr}
                  onRateQddr={onRateQddr}
                  isNewlySubmitted={newlySubmittedReport?.type === 'qddr' && Number(newlySubmittedReport?.id) === Number(item.id)}
                />
              )
            })}
          </div>

          {/* Pagination Controls for Combined Feed */}
          {combinedReports.length > itemsPerPage && (
            <div className="reports-feed-pagination">
              <div className="reports-feed-pagination-info">
                <span>
                  Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, combinedReports.length)}</strong> of <strong>{combinedReports.length}</strong> reports
                </span>
                <div className="reports-feed-per-page">
                  <label htmlFor="my-reports-per-page">Per page:</label>
                  <select
                    id="my-reports-per-page"
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
                    disabled={currentPage === totalPages || combinedReports.length === 0}
                    title="Next Page"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
          )}
        </>
      )}

      {/* Render combined "All" in table view */}
      {subTab === 'all' && viewMode === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {carReports.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <FileCheck size={16} color="#1A435A" />
                <h4 style={{ margin: 0, color: '#1A435A', fontSize: '14px', fontWeight: '600' }}>
                  Corrective Actions (CAR) — {carReports.length}
                </h4>
              </div>
              <CARReportsList
                carReports={carReports}
                isLoading={false}
                onSelectCar={onSelectCar}
                canEdit={canEdit}
                onEditCar={onEditCar}
                onDeleteCar={onDeleteCar}
                onRateCar={onRateCar}
                viewMode="table"
                newlySubmittedId={newlySubmittedReport?.type === 'car' ? newlySubmittedReport?.id : null}
              />
            </div>
          )}

          {qddrReports.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertTriangle size={16} color="#1A435A" />
                <h4 style={{ margin: 0, color: '#1A435A', fontSize: '14px', fontWeight: '600' }}>
                  Defects & Disposal (QDDR) — {qddrReports.length}
                </h4>
              </div>
              <QDDRReportsList
                qddrReports={qddrReports}
                isLoading={false}
                onSelectQddr={onSelectQddr}
                canEdit={canEdit}
                onEditQddr={onEditQddr}
                onDeleteQddr={onDeleteQddr}
                onRateQddr={onRateQddr}
                viewMode="table"
                newlySubmittedId={newlySubmittedReport?.type === 'qddr' ? newlySubmittedReport?.id : null}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
