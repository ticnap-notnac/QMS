import { useMemo, useState, useEffect } from 'react'
import { FileSignature } from 'lucide-react'
import SearchableDropdown from '@/components/Forms/SearchableDropdown'

export default function AssignReportModal({ 
  isOpen, onClose, report, onSuccess,
  selectedUserId, setSelectedUserId,
  userOptions, loadingUsers,
  isSubmitting, error, handleAssign
}) {
  const reportLabel = useMemo(() => report?.reference_no || 'NCR Report', [report])
  const [searchValue, setSearchValue] = useState('')

  // Sync input value with the label of the selected employee
  useEffect(() => {
    if (!selectedUserId) {
      setSearchValue('')
      return
    }
    const found = userOptions.find(opt => String(opt.id) === String(selectedUserId))
    if (found) {
      setSearchValue(found.label)
    }
  }, [selectedUserId, userOptions, isOpen])

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
            <SearchableDropdown
              label="Assign to employee"
              value={searchValue}
              onValueChange={setSearchValue}
              options={userOptions}
              loading={loadingUsers}
              placeholder="Search employee..."
              onSelectOption={(option) => {
                setSelectedUserId(option.id)
              }}
            />
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
