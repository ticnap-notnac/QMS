import { X as CloseIcon } from 'lucide-react'

export default function PreventiveActionModal({
  isOpen,
  onClose,
  preventiveRating,
  onPreventiveRatingChange,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card reports-preventive-card">
        <button onClick={onClose} className="modal-close-button">
          <CloseIcon size={18} />
        </button>
        <div className="modal-body-col">
          <div>
            <label className="label-field">Suggested Preventive Action:</label>
            <div className="workspace-placeholder workspace-placeholder--small">
              <span className="reports-upload-text-small">Preventive Directives Content Sheet Panel</span>
              <div className="cross-line-bg" />
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
          <div className="reports-preventive-submit-row">
            <button type="button" onClick={onClose} className="reports-secondary-muted">
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
