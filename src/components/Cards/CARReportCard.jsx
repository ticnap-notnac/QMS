import { User, SquarePen, Trash2 } from 'lucide-react'
import { formatDate, getStatusStyle } from '@/utils/themeHelpers'
import { REPORT_STATUS } from '../../../shared/constants'

function CARReportCard({ car, canEdit, onSelectCar, onEditCar, onDeleteCar }) {
  const requestor = car.requestor?.trim() || 'Requestor'
  const recipient = car.recipient?.trim() || 'Recipient'
  const reqDept = car.requesting_department?.trim() || 'Requesting Dept'
  const respDept = car.responsible_department?.trim() || 'Responsible Dept'
  
  const statusClean = String(car.status || '').trim().toLowerCase()
  const isClosed = statusClean === 'closed'
  const isUnderVerification = statusClean === 'under_verification'

  const issueTypes = []
  if (car.quality_food_safety) issueTypes.push('Quality/Food Safety')
  if (car.environment_health_safety) issueTypes.push('EHS')
  if (car.security_issue) issueTypes.push('Security')
  if (car.internal_audit) issueTypes.push('Internal Audit')
  if (car.customer_complaint) issueTypes.push('Customer Complaint')
  if (car.government_agency_audit) issueTypes.push('Gov Audit')
  if (car.customer_audit_nonconformance) issueTypes.push('Customer Audit')
  if (car.vendor_nonconformance) issueTypes.push('Vendor')
  if (car.others) issueTypes.push(`Others: ${car.others}`)
  const issueTypeStr = issueTypes.join(', ') || '—'

  let statusBg = '#f1f5f9'
  let statusColor = '#475569'
  let statusBorder = '1px solid #cbd5e1'
  let statusText = 'OPEN'

  if (isClosed) {
    statusBg = '#f0fdf4'
    statusColor = '#166534'
    statusBorder = '1px solid #bbf7d0'
    statusText = 'CLOSED'
  } else if (isUnderVerification) {
    statusBg = '#eff6ff'
    statusColor = '#1e40af'
    statusBorder = '1px solid #bfdbfe'
    statusText = 'UNDER VERIFICATION'
  } else {
    statusBg = '#fef2f2'
    statusColor = '#991b1b'
    statusBorder = '1px solid #fecaca'
    statusText = 'OPEN'
  }

  const unifiedBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '95px',
    height: '28px',
    padding: '0 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textAlign: 'center',
    boxSizing: 'border-box'
  }

  return (
    <div className="reports-card" id={`car-report-card-${car.id}`} onClick={() => onSelectCar && onSelectCar(car)} style={{ cursor: onSelectCar ? 'pointer' : 'default' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="reports-card-header">
        <div className="reports-user-block">
          <div className="reports-avatar">
            <User size={20} color="#0f172a" />
          </div>
          <div className="reports-user-text">
            <span className="reports-user-name">
              {requestor}
              <span className="reports-ref-number">
                {car.reference_no?.trim() || `CAR-${car.id}`}
              </span>
            </span>
            <span className="reports-user-meta">
              {reqDept} (To: {recipient} - {respDept}) • {car.request_date ? new Date(car.request_date).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>

        <div className="badges-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Status Badge */}
          <span style={{ ...unifiedBadgeStyle, background: statusBg, color: statusColor, border: statusBorder }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* ── Details Section ─────────────────────────────────────────────── */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Details</h4>
      </div>
      
      <div className="reports-grid-2-col">
        <div>
          <div className="reports-label-small">Product / Material</div>
          <div className="reports-value-text">{car.product_material_name?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Model / Type</div>
          <div className="reports-value-text">{car.model_type?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Control No.</div>
          <div className="reports-value-text">{car.control_no?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Affected Qty</div>
          <div className="reports-value-text">{String(car.affected_quantity ?? '').trim() || '—'}</div>
        </div>
        <div className="grid-col-span-2">
          <div className="reports-label-small">Issue Type</div>
          <div className="reports-value-text">{issueTypeStr}</div>
        </div>
      </div>

      <div className="reports-section-label">
        <div className="reports-label-small">Nonconformance Details</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {car.details_of_nonconformance || 'No details provided.'}
        </span>
      </div>

      {/* ── Action row ──────────────────────────────────────────────────── */}
      {canEdit && (
        <div className="action-btn-row" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn-action-icon"
            onClick={() => onEditCar && onEditCar(car)}
            title="Edit report"
          >
            <SquarePen size={16} />
          </button>
          <button
            type="button"
            className="btn-action-icon-danger"
            onClick={() => onDeleteCar && onDeleteCar(car.id)}
            title="Delete report"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default CARReportCard
