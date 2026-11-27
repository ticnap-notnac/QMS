import { useMemo, useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import './SearchableDropdown.css'

/**
 * @param {{
 *   label?: string,
 *   value: string,
 *   onValueChange: (val: string) => void,
 *   options: Array<{ id: string|number, label: string }>,
 *   loading?: boolean,
 *   placeholder?: string,
 *   onSelectOption?: (option: { id: string|number, label: string }) => void,
 *   required?: boolean,
 * }} props
 */
function SearchableDropdown({
  label,
  value,
  onValueChange,
  options = [],
  loading = false,
  placeholder = '',
  onSelectOption,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Clean trailing asterisks from string labels to avoid duplication/dark asterisks
  const cleanLabel = typeof label === 'string' ? label.replace(/\s*\*+$/, '') : label

  const filteredOptions = useMemo(() => {
    const query = String(value || '').trim().toLowerCase()
    if (!query) return options
    return options.filter((o) => String(o.label || '').toLowerCase().includes(query))
  }, [options, value])

  // Clean outside click listener to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  return (
    <div className="searchable-dropdown-root" ref={containerRef}>
      {cleanLabel && (
        <label className="label-field" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
          {cleanLabel}
          {required && (
            <span
              className="required-asterisk"
              style={{
                color: '#dc2626',
                marginLeft: '4px',
                fontWeight: 700,
                fontSize: '15px',
                lineHeight: 1
              }}
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="searchable-dropdown-input-wrapper">
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => {
            onValueChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="searchable-dropdown-input input-field"
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className={`searchable-dropdown-icon ${isOpen ? 'open' : ''}`}>
          <ChevronDown size={18} />
        </div>

        {isOpen && (
          <div className="searchable-dropdown-menu">
            {loading ? (
              <div className="searchable-dropdown-empty">Loading options...</div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = String(value || '').trim().toLowerCase() === String(option.label || '').trim().toLowerCase()
                return (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onValueChange(option.label)
                      if (onSelectOption) onSelectOption(option)
                      setIsOpen(false)
                    }}
                    className={`searchable-dropdown-item dropdown-option-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check size={16} style={{ color: '#0284c7' }} />}
                  </button>
                )
              })
            ) : (
              <div className="searchable-dropdown-empty">
                No matches found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchableDropdown
