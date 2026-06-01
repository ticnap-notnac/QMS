/**
 * components/ReportCard.jsx
 *
 * feat(reports): extract ReportCard from ReportsPage open reports render map
 *
 * Renders a single open NCR report with:
 *   - Reporter identity block
 *   - Status / severity / assignment badges
 *   - Description detail panel
 *   - Assignment label (if assigned)
 *   - Evidence image
 *   - Assign / Update action row (role-gated)
 */

import { User, SquarePen } from 'lucide-react'
import { formatDate, getStatusStyle, getSeverityStyle, formatAssignedUser } from '@/hooks/useReportsLogic'

/**
 * @param {{
 *   report: object,
 *   departmentNameById: Map<string, string>,
 *   canAssignReports: boolean,
 *   onUpdate: (report: object) => void,
 *   onAssign: (report: object) => void,
 * }} props
 */
function ReportCard({ report, departmentNameById, canAssignReports, onUpdate, onAssign }) {
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

      {/* ── Action row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        {canAssignReports && !isAssigned && (
          <button
            type="button"
            className="btn-edit-user"
            onClick={() => onAssign(report)}
            title="Assign report"
          >
            Assign
          </button>
        )}
        <button
          type="button"
          className="btn-edit-user"
          onClick={() => onUpdate(report)}
          title="Update report"
        >
          <SquarePen size={16} />
        </button>
      </div>
    </div>
  )
}

export default ReportCard