/**
 * components/InvestigatedReportCard.jsx
 *
 * feat(reports): extract InvestigatedReportCard from ReportsPage approval queue
 *
 * Renders a single investigated/resolved NCR report with:
 *   - Reporter identity block
 *   - Status / severity / approval badges
 *   - Investigation + resolution detail panels
 *   - Resolution time & verification date grid
 *   - Investigation evidence image
 *   - Approve / Reject / Update action row (role-gated)
 */

import { User, SquarePen, Trash2 } from 'lucide-react'
import { formatDate, getStatusStyle, getSeverityStyle, getApprovalState, formatAssignedUser } from '@/utils/themeHelpers'

/**
 * @param {{
 *   report: object,
 *   departmentNameById: Map<string, string>,
 *   canAssignReports: boolean,
 *   canUpdateReport: (report: object) => boolean,
 *   onApprove: (report: object) => void,
 *   onReject: (report: object) => void,
 *   onUpdate: (report: object) => void,
 * }} props
 */
function InvestigatedReportCard({ report, departmentNameById, userNameById, canAssignReports, canApproveReport, canUpdateReport, canDeleteReport, onApprove, onReject, onUpdate, onDelete }) {
  const reporterName = report.reporter_full_name || 'Name of the User'
  const reporterRole = report.reporter_role_name || 'Position'
  const reporterDepartment =
    departmentNameById.get(String(report.department_id)) ||
    report.reporter_department_name ||
    'Department'
  const reportLocation = report.location_name || report.complaint_location || 'Location'

  const assignmentLabel = formatAssignedUser(report, userNameById)
  const statusStyle = getStatusStyle(report.status)
  const severityStyle = getSeverityStyle(report.severity)
  const approvalState = getApprovalState(report)
  const isApproved = approvalState === 'approved'

  const approvalBadgeStyle = isApproved
    ? { background: '#e2fbe8', color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.25)' }
    : { background: '#fffbeb', color: '#b45309', borderColor: 'rgba(245, 158, 11, 0.25)' }

  const resolutionTimeLabel = report.resolution_time_value
    ? `${report.resolution_time_value} ${report.resolution_time_unit || ''}`.trim()
    : 'Not available'

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

        <div className="badges-row">
          <span className="status-badge" style={statusStyle}>
            {String(report.status || 'open').toUpperCase()}
          </span>
          <span className="day-badge" style={severityStyle}>
            {String(report.severity || 'low').toUpperCase()}
          </span>
          <span className="status-badge" style={approvalBadgeStyle}>
            {isApproved ? 'APPROVED' : 'PENDING APPROVAL'}
          </span>
        </div>
      </div>

      {/* ── Investigation details ───────────────────────────────────────── */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Investigation Details</h4>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {report.investigation_details || 'No investigation details provided.'}
        </span>
      </div>

      {/* ── Resolution details ──────────────────────────────────────────── */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Resolution Details</h4>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {report.resolution_details || 'No resolution details provided.'}
        </span>
      </div>

      {/* ── Resolution time / verification date ────────────────────────── */}
      <div className="reports-grid-2-16" style={{ marginTop: '12px' }}>
        <div className="reports-details-box">
          <span className="reports-workspace-text">Resolution Time: {resolutionTimeLabel}</span>
        </div>
        <div className="reports-details-box">
          <span className="reports-workspace-text">Verification Date: {formatDate(report.verification_date)}</span>
        </div>
      </div>

      {/* ── Preventive Action Rating ───────────────────────────────────── */}
      {report.preventive_rating && (
        <>
          <div className="reports-details-title-wrap">
            <h4 className="reports-details-title">Suggested Preventive Action</h4>
          </div>
          <div className="reports-details-box">
            <span className="reports-workspace-text" style={{ color: 'var(--teal-accent, #38bdf8)', fontWeight: 'bold' }}>
              {report.preventive_rating}
            </span>
          </div>
        </>
      )}

      {/* ── Investigation evidence ──────────────────────────────────────── */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Investigation Evidence</h4>
      </div>
      <div className="evidence-box">
        {report.investigation_evidence_url ? (
          <img
            src={report.investigation_evidence_url}
            alt="Investigation evidence"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => window.open(report.investigation_evidence_url, '_blank', 'noopener,noreferrer')}
          />
        ) : (
          <p style={{ color: 'var(--muted)', textAlign: 'center' }}>No investigation image attached</p>
        )}
      </div>

      {/* ── Action row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        {canApproveReport && canApproveReport(report) && (
          <button
            type="button"
            className="btn-edit-user"
            onClick={() => onApprove(report)}
            disabled={isApproved}
            title="Approve updated report"
          >
            {isApproved ? 'Approved' : 'Approve'}
          </button>
        )}

        {canApproveReport && canApproveReport(report) && !isApproved && (
          <button
            type="button"
            className="btn-edit-user"
            onClick={() => onReject(report)}
            title="Reject updated report"
          >
            Reject
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

export default InvestigatedReportCard