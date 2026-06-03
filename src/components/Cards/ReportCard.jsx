import { User, SquarePen } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDate, getStatusStyle, getSeverityStyle, formatAssignedUser } from '@/hooks/useReportsLogic'
import { getReportRating, rateReport } from '@/services/ncrService'
import StarRating from '../UI/StarRating'

function ReportCard({ report, departmentNameById, canAssignReports, canUpdateReport, onUpdate, onAssign }) {
  const reporterName = report.reporter_full_name || 'Name of the User'
  const reporterRole = report.reporter_role_name || 'Position'
  const reporterDepartment =
    report.reporter_department_name ||
    departmentNameById.get(String(report.department_id)) ||
    'Department'
  const reportLocation = report.location_name || report.complaint_location || 'Location'

  const statusStyle = getStatusStyle(report.status)
  const severityStyle = getSeverityStyle(report.severity)
  const assignmentLabel = formatAssignedUser(report)
  const isAssigned = Boolean(report.assigned_to)
  const isClosed = String(report.status || '').toLowerCase() === 'closed'

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

  return (
    <div className="reports-card" id={`report-card-${report.id}`}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="reports-card-header">
        <div className="reports-user-block">
          <div className="reports-avatar">
            <User size={20} className="icon-cyan" />
          </div>
          <div className="reports-user-text">
            <span className="reports-user-name">{reporterName}</span>
            <span className="reports-user-meta">
              {reporterRole} • {reporterDepartment} • {reportLocation} • {formatDate(report.created_at)}
            </span>
          </div>
        </div>

        <div className="badges-row">
          <span className="status-badge" style={statusStyle}>
            {String(report.status || 'open').toUpperCase()}
          </span>
          <span className="day-badge" style={severityStyle}>
            {String(report.severity || 'low').toUpperCase()}
          </span>
          {isAssigned && (
            <span
              className="status-badge"
              style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fde68a', borderColor: 'rgba(245, 158, 11, 0.35)' }}
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
      </div>
    </div>
  )
}

export default ReportCard