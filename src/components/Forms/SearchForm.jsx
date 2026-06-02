import { useEffect, useState, useRef } from 'react'

export default function SearchForm({ value, onChange, onSubmit, placeholder = 'Search...', ariaLabel = 'Search', debounceMs = 0 }) {
  const [local, setLocal] = useState(value || '')
  const timer = useRef(null)

  // Keep local state in sync with incoming value if it changes externally
  if (value !== undefined && value !== null && value !== local && !timer.current) {
    setLocal(value)
  }

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setLocal(v)
    if (debounceMs > 0) {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => onChange(v), debounceMs)
    } else {
      onChange(v)
    }
  }

  return (
    <form className="search-container" onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit() }}>
      <input
        type="text"
        placeholder={placeholder}
        value={local}
        onChange={handleChange}
        className="search-input-light"
        aria-label={ariaLabel}
      />
      <button type="submit" className="search-icon" aria-label={ariaLabel}>🔍</button>
    </form>
  )
}
