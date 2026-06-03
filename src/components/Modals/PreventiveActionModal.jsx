import { X as CloseIcon } from 'lucide-react'

export default function PreventiveActionModal({
  isOpen,
  onClose,
  report,
  suggestedPreventiveAction,
  preventiveRating,
  onPreventiveRatingChange,
  onSubmit,
  isSubmitting,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card reports-preventive-card" style={{ maxWidth: '600px', width: '95%' }}>
        <button type="button" onClick={onClose} className="modal-close-button">
          <CloseIcon size={18} />
        </button>
        <div className="modal-body-col" style={{ gap: '16px' }}>
          <div className="modal-header-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="reports-update-title" style={{ fontSize: '18px', margin: 0 }}>Rate Suggested Preventive Action</h3>
            {report?.reference_no && <span style={{ color: 'var(--cyan-light, #22d3ee)', fontSize: '14px', fontWeight: 'bold' }}>{report.reference_no}</span>}
          </div>

          {report && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(15, 23, 42, 0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div>
                <label className="label-field" style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Report Description:</label>
                <div style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: '1.4' }}>{report.description}</div>
              </div>
              {report.corrective_action && (
                <div>
                  <label className="label-field" style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Corrective Action Taken:</label>
                  <div style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: '1.4' }}>{report.corrective_action}</div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label-field">Suggested Preventive Action:</label>
            <div className="reports-readonly-field" style={{ minHeight: '60px', whiteSpace: 'pre-wrap', lineHeight: '1.4', background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
              {suggestedPreventiveAction || 'No preventive action suggested.'}
            </div>
          </div>
          <div className="preventive-panel">
            <span className="label-field label-field--small">Suggested Preventive Action Rating:</span>
            <div className="preventive-options">
              {['Excellent', 'Good', 'Ok', 'Poor', 'Very Poor'].map((rating) => (
                <label key={rating} className="preventive-option">
                  <input
                    type="radio"
                    name="preventiveRating"
                    value={rating}
                    checked={preventiveRating === rating}
                    onChange={(e) => onPreventiveRatingChange(e.target.value)}
                    className="radio-accent"
                  />
                  {rating}
                </label>
              ))}
            </div>
          </div>
          <div className="reports-preventive-submit-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onSubmit}
              className="btn-gradient-primary"
              style={{ padding: '8px 24px', height: 'auto', borderRadius: '6px' }}
              disabled={isSubmitting || !preventiveRating}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
