import { useState, useRef, useEffect } from 'react'
import './Tooltip.css'

export default function Tooltip({
  children,
  content,
  position = 'top',
  className = '',
  style = {},
  delay = 50
}) {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!content) return children

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (delay <= 0) {
      setIsVisible(true)
    } else {
      timerRef.current = setTimeout(() => {
        setIsVisible(true)
      }, delay)
    }
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsVisible(false)
  }

  return (
    <div
      className={`tooltip-wrapper ${className}`.trim()}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div role="tooltip" className={`tooltip-content tooltip-${position}`}>
          {content}
          <div className={`tooltip-arrow tooltip-arrow-${position}`} />
        </div>
      )}
    </div>
  )
}
