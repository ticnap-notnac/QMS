import React, { useState, useRef } from 'react'

/**
 * StarRating component
 * @param {Object} props
 * @param {number} props.rating - Current rating (0 to 5)
 * @param {function} props.onRatingChange - Callback when a rating is selected
 * @param {boolean} props.readOnly - If true, the rating cannot be changed
 * @param {number} props.size - Size of the stars in pixels
 * @param {number} props.maxStars - Maximum number of stars
 */
export default function StarRating({
  rating = 0,
  onRatingChange,
  readOnly = false,
  size = 24,
  maxStars = 5
}) {
  const [hoverValue, setHoverValue] = useState(null)
  const containerRef = useRef(null)

  const handleMouseMove = (e, index) => {
    if (readOnly) return
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - left) / width
    // if mouse is on the left half of the star, it's a half star, otherwise full star
    const value = index + (percent < 0.5 ? 0.5 : 1)
    setHoverValue(value)
  }

  const handleMouseLeave = () => {
    if (readOnly) return
    setHoverValue(null)
  }

  const handleClick = () => {
    if (readOnly) return
    if (hoverValue !== null && onRatingChange) {
      onRatingChange(hoverValue)
    }
  }

  const displayValue = hoverValue !== null ? hoverValue : rating

  return (
    <div
      ref={containerRef}
      style={{ display: 'inline-flex', gap: '4px', cursor: readOnly ? 'default' : 'pointer' }}
      onMouseLeave={handleMouseLeave}
    >
      {[...Array(maxStars)].map((_, i) => {
        const fillPercentage = Math.max(0, Math.min(100, (displayValue - i) * 100))
        return (
          <div
            key={i}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onClick={handleClick}
            style={{
              position: 'relative',
              width: `${size}px`,
              height: `${size}px`,
              display: 'inline-block'
            }}
          >
            {/* Background (Empty) Star */}
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>

            {/* Foreground (Filled) Star */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${fillPercentage}%`,
                height: '100%',
                overflow: 'hidden'
              }}
            >
              <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="#f59e0b"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}
