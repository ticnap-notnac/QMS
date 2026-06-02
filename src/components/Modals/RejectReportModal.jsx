import { SquarePen } from 'lucide-react'

export default function RejectReportModal({
  isOpen,
  report,
  rejectReason,
  onReasonChange,
  onClose,
  onSubmit,
  isSubmitting,
}) {
  if (!isOpen || !report) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card--tall reports-update-card">
        <button type="button" onClick={onClose} className="modal-close-button">×</button>
        <div className="modal-header-row">
          <SquarePen size={18} className="icon-teal" />
          <h3 className="reports-update-title">Reject Updated Report</h3>
        </div>
        <p className="glass-card-subtext" style={{ marginBottom: '12px' }}>
          Enter a rejection reason so the reporter can revise before resubmitting.
        </p>
        <div className="modal-form reports-form-compact">
          <div className="reports-details-box">
            <span className="reports-workspace-text">Report: {report.reference_no || report.id}</span>
          </div>
          <div>
            <label className="label-field">Rejection Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="input-field textarea-medium"
              placeholder="Explain what needs to be fixed before resubmission..."
            />
          </div>
          <div className="reports-update-submit-row">
            <button type="button" className="btn-edit-user" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button
              type="button"
              className="btn-gradient-primary reports-update-button"
              onClick={() => onSubmit(report, 'reject', rejectReason)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rejecting...' : 'Reject Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
