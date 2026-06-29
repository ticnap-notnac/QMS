import { useMemo, useState } from 'react'

/**
 * @param {{
 *   label: string,
 *   value: string,
 *   onValueChange: (val: string) => void,
 *   options: Array<{ id: string|number, label: string }>,
 *   loading?: boolean,
 *   placeholder?: string,
 *   onSelectOption: (option: { id: string|number, label: string }) => void,
 * }} props
 */
function SearchableDropdown({ label, value, onValueChange, options, loading = false, placeholder = '', onSelectOption, required = false }) {
  const [isOpen, setIsOpen] = useState(false)

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return options
    return options.filter((o) => String(o.label || '').toLowerCase().includes(query))
  }, [options, value])

  return (
    <div>
      <label className="label-field">
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold', fontSize: '16px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => { onValueChange(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          className="input-field"
          placeholder={placeholder}
        />

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              zIndex: 20,
              marginTop: '6px',
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              background: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {loading ? (
              <div style={{ padding: '12px 14px', color: '#64748b' }}>Loading...</div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onValueChange(option.label)
                    onSelectOption(option)
                    setIsOpen(false)
                  }}
                  className="dropdown-option-btn"
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div style={{ padding: '12px 14px', color: '#64748b' }}>
                No matches found. You can keep typing a custom value.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchableDropdown