import { useMemo } from 'react'
import { FileSignature } from 'lucide-react'
import useAssignReportModal from '@/hooks/useAssignReportModal'

export default function AssignReportModal({ isOpen, onClose, report, onSuccess }) {
  const {
    selectedUserId,
    setSelectedUserId,
    userOptions,
    loadingUsers,
    isSubmitting,
    error,
    handleAssign,
  } = useAssignReportModal({ report, onSuccess, onClose })

  const reportLabel = useMemo(() => report?.reference_no || 'NCR Report', [report])

  if (!isOpen) return null

  const handleConfirmAssign = async () => {
    const result = await handleAssign()
    if (result?.success) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card--tall reports-update-card">
        <button type="button" onClick={onClose} className="modal-close-button">×</button>
        <div className="modal-header-row">
          <FileSignature size={18} className="icon-teal" />
          <h3 className="reports-update-title">Assign Report</h3>
        </div>

        <div className="glass-card-subtext" style={{ marginBottom: '14px' }}>
          {reportLabel}
        </div>

        {error ? <div className="user-info-error">{error}</div> : null}

        <div className="modal-form reports-form-compact">
          <div>
            <label className="label-field">Assign to employee</label>
            <select
              className="select-field"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              disabled={loadingUsers || isSubmitting}
            >
              <option value="">Select employee</option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="reports-update-submit-row">
            <button type="button" className="reports-secondary-muted" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="button" className="btn-gradient-primary reports-update-button" onClick={handleConfirmAssign} disabled={loadingUsers || isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
