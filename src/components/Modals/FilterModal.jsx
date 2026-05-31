import { Calendar, Filter } from 'lucide-react'
import useFilterModal from '@/hooks/useFilterModal'

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'OPEN' },
  { value: 'closed', label: 'CLOSED' },
]

function FilterToggleButton({ label, selected, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-option-button ${className}`.trim()}
      style={{
        background: selected ? 'rgba(6, 182, 212, 0.16)' : 'rgba(255, 255, 255, 0.05)',
        borderColor: selected ? 'rgba(6, 182, 212, 0.55)' : 'rgba(255, 255, 255, 0.1)',
        color: selected ? '#a5f3fc' : '#cbd5e1',
      }}
    >
      {label}
    </button>
  )
}

export default function FilterModal({ isOpen, onClose, onApplyFilters, onClearFilters }) {
  const {
    departments,
    departmentsLoading,
    error,
    isApplying,
    selectedDepartment,
    setSelectedDepartment,
    selectedStatus,
    setSelectedStatus,
    selectedSeveritiesSet,
    selectedDate,
    setSelectedDate,
    toggleSeverity,
    applyFilters,
    clearFilters,
  } = useFilterModal({ onApplyFilters, onClearFilters })

  if (!isOpen) return null

  const handleApply = async () => {
    await applyFilters()
    onClose()
  }

  const handleClear = async () => {
    await clearFilters()
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card--large">
        <button type="button" onClick={onClose} className="modal-close-button">
          ×
        </button>
        <div className="modal-header-row">
          <Filter size={20} className="icon-teal" />
          <h3 className="modal-title-lg">Filter Reports</h3>
        </div>

        {error ? <div className="user-info-error">{error}</div> : null}

        <div className="modal-grid">
          <div className="modal-col">
            <div className="modal-grid-2">
              <div>
                <label className="label-field">Department</label>
                <select
                  className="input-field"
                  value={selectedDepartment}
                  onChange={(event) => setSelectedDepartment(event.target.value)}
                  disabled={departmentsLoading}
                >
                  <option value="">Select</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Date</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="DD-MM-YYYY"
                    className="input-field"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                  <Calendar size={14} className="icon-abs" />
                </div>
              </div>
            </div>

            <div>
              <label className="label-field">Status</label>
              <div className="filter-options-row">
                {STATUS_OPTIONS.map((option) => (
                  <FilterToggleButton
                    key={option.value}
                    label={option.label}
                    selected={selectedStatus === option.value}
                    onClick={() => setSelectedStatus(selectedStatus === option.value ? '' : option.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="label-field">Severity Level</label>
              <div className="filter-options-row wrap">
                {SEVERITY_OPTIONS.map((option) => (
                  <FilterToggleButton
                    key={option.value}
                    label={option.label}
                    selected={selectedSeveritiesSet.has(option.value)}
                    onClick={() => toggleSeverity(option.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-col">
            <div className="glass-card-subtext">
              Filtering uses department, status, severity, and occurrence date.
            </div>
          </div>
        </div>

        <div className="modal-actions-center" style={{ gap: '12px' }}>
          <button type="button" onClick={handleClear} className="reports-secondary-muted" disabled={isApplying}>
            Clear Filters
          </button>
          <button type="button" onClick={handleApply} className="btn-gradient-primary" disabled={isApplying}>
            {isApplying ? 'Filtering...' : 'Filter Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
