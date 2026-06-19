import { User, SquarePen, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDate, getStatusStyle, getSeverityStyle, formatAssignedUser } from '@/utils/themeHelpers'
import { getReportRating, rateReport } from '@/services/ncrService'
import StarRating from '../UI/StarRating'
import { REPORT_STATUS } from '../../../shared/constants'

function ReportCard({ report, departmentNameById, canAssignReports, canUpdateReport, canDeleteReport, onUpdate, onAssign, onDelete }) {
  const reporterName = report.reporter_full_name || 'Name of the User'
  const reporterRole = report.reporter_role_name || 'Position'
  const reporterDepartment =
    departmentNameById.get(String(report.department_id)) ||
    report.reporter_department_name ||
    'Department'
  const reportLocation = report.location_name || report.complaint_location || 'Location'
  const statusStyle = getStatusStyle(report.status)
  const severityStyle = getSeverityStyle(report.severity)
  const assignmentLabel = formatAssignedUser(report)
  const isAssigned = Boolean(report.assigned_to)
  const isClosed = String(report.status || '').toUpperCase() === REPORT_STATUS.CLOSED.toUpperCase()

  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0, userRating: null })
  const [isRatingLoading, setIsRatingLoading] = useState(false)
  const [ratingError, setRatingError] = useState(null)

  useEffect(() => {
    if (isClosed) {
      setIsRatingLoading(true)
      getReportRating(report.id)
        .then((res) => {
          if (res && res.data) setRatingStats(res.data)
        })
        .catch((err) => console.error('Failed to load rating stats:', err))
        .finally(() => setIsRatingLoading(false))
    }
  }, [isClosed, report.id])

  const handleRatingChange = async (newRating) => {
    if (ratingStats.userRating !== null) return // already rated
    try {
      setRatingError(null)
      const res = await rateReport(report.id, newRating)
      // Optimistically update
      setRatingStats(prev => {
        const newCount = prev.count + 1
        const newAvg = ((prev.average * prev.count) + newRating) / newCount
        return { average: newAvg, count: newCount, userRating: newRating }
      })
      alert('Rating submitted successfully!')
    } catch (err) {
      setRatingError('Failed to submit rating: ' + (err.message || 'Unknown error'))
      console.error(err)
    }
  }

  /* 🎯 THE FIX: Shared configuration options for structural symmetry across all tag blocks */
  const unifiedBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '95px',        /* Enforces matching widths across various word lengths */
    height: '28px',          /* Matches row block height settings completely */
    padding: '0 12px',       /* Balanced internal padding values */
    borderRadius: '6px',     /* Standard structural corner rounding style */
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textAlign: 'center',
    boxSizing: 'border-box'
  }

  return (
    <div className="reports-card" id={`report-card-${report.id}`}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="reports-card-header">
        <div className="reports-user-block">
          <div className="reports-avatar">
            <User size={20} color="#0f172a" />
          </div>
          <div className="reports-user-text">
            <span className="reports-user-name">{reporterName}</span>
            <span className="reports-user-meta">
              {reporterRole} • {reporterDepartment} • {reportLocation} • {formatDate(report.created_at)}
            </span>
          </div>
        </div>

        <div className="badges-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Status Badge */}
          <span style={{ ...unifiedBadgeStyle, ...statusStyle }}>
            {String(report.status || 'open').toUpperCase()}
          </span>

          {/* Severity Badge */}
          <span style={{ ...unifiedBadgeStyle, ...severityStyle }}>
            {String(report.severity || 'low').toUpperCase()}
          </span>

          {/* Assigned Status Badge */}
          {isAssigned && (
            <span
              style={{ 
                ...unifiedBadgeStyle, 
                background: '#fffbeb', 
                color: '#b45309', 
                border: '1px solid rgba(245, 158, 11, 0.25)' 
              }}
            >
              ASSIGNED
            </span>
          )}
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────── */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Details</h4>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {report.description || 'No description provided.'}
        </span>
      </div>

      {/* ── Assignment label ────────────────────────────────────────────── */}
      {assignmentLabel && (
        <div className="reports-details-box" style={{ marginTop: '10px' }}>
          <span className="reports-workspace-text">{assignmentLabel}</span>
        </div>
      )}

      {/* ── Evidence ────────────────────────────────────────────────────── */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Evidence</h4>
      </div>
      <div className="evidence-box">
        {report.evidence_url ? (
          <img
            src={report.evidence_url}
            alt="Evidence"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => window.open(report.evidence_url, '_blank', 'noopener,noreferrer')}
          />
        ) : (
          <p style={{ color: 'var(--muted)', textAlign: 'center' }}>No evidence image attached</p>
        )}
      </div>

      {/* ── Rating Section (Closed Reports) ─────────────────────────────── */}
      {isClosed && (
        <>
          <div className="reports-details-title-wrap">
            <h4 className="reports-details-title">Report Rating</h4>
          </div>
          <div className="reports-details-box" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <StarRating
                rating={ratingStats.userRating !== null ? ratingStats.userRating : ratingStats.average}
                onRatingChange={handleRatingChange}
                readOnly={ratingStats.userRating !== null}
              />
              <span className="reports-workspace-text">
                {ratingStats.average > 0 ? `${ratingStats.average.toFixed(1)} ★ · ${ratingStats.count} ratings` : 'No ratings yet'}
              </span>
            </div>
            {ratingStats.userRating !== null && (
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>You rated this report {ratingStats.userRating} stars.</span>
            )}
            {ratingError && <span style={{ fontSize: '12px', color: 'var(--error, #ef4444)' }}>{ratingError}</span>}
          </div>
        </>
      )}

      {/* ── Action row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        {canAssignReports && !isAssigned && !isClosed && (
          <button
            type="button"
            className="btn-edit-user"
            onClick={() => onAssign(report)}
            title="Assign report"
          >
            Assign
          </button>
        )}
        {isClosed && (
          <button
            type="button"
            className="btn-edit-user"
            onClick={() => onUpdate(report)}
            title="View Details"
            style={{
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            View Details
          </button>
        )}
        {canUpdateReport && canUpdateReport(report) && (
          <button
            type="button"
            className="btn-edit-user"
            onClick={() => onUpdate(report)}
            title="Update report"
          >
            <SquarePen size={16} />
          </button>
        )}
        {canDeleteReport && canDeleteReport(report) && (
          <button
            type="button"
            className="btn-delete-user"
            onClick={() => onDelete(report)}
            title="Delete report"
            style={{
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fef2f2',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              color: '#dc2626',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export default ReportCard