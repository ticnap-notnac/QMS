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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <FileSignature size={18} className="icon-teal" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 600 }}>Assign Report</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted, #64748b)', textTransform: 'uppercase', fontWeight: 600 }}>Report Reference</span>
            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{reportLabel}</strong>
          </div>

          {error ? <div className="user-info-error" style={{ margin: 0 }}>{error}</div> : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
        </div>

        <div style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          <button 
            type="button" 
            className="btn-secondary-light" 
            onClick={onClose} 
            disabled={isSubmitting}
            style={{ margin: 0, padding: '8px 20px', fontSize: '13px', height: '36px', display: 'flex', alignItems: 'center' }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn-gradient-primary" 
            onClick={handleConfirmAssign} 
            disabled={loadingUsers || isSubmitting}
            style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: '36px', display: 'flex', alignItems: 'center', boxShadow: 'none' }}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
