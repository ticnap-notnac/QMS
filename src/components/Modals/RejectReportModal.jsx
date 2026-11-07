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
          <div className="modal-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '16px', marginTop: '16px' }}>
            <button type="button" className="btn-secondary-light" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button
              type="button"
              className="btn-gradient-primary"
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
