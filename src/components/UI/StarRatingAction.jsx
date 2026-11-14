import React, { useState } from 'react';
import { Star, SquarePen, X } from 'lucide-react';

/**
 * Interactive 5-Star Rating Component for Closed CAR & QDDR Reports.
 * - Unrated or Editing state: 5 interactive star buttons (1-5) with hover preview.
 * - Rated state: Displays user's rating (★★★★☆ X/5), overall average badge, and an Edit button.
 */
export const StarRatingAction = ({
  myRating = null,
  averageRating = null,
  ratingsCount = 0,
  onRate,
  variant = 'compact',
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasRated = Number.isInteger(Number(myRating)) && Number(myRating) >= 1 && Number(myRating) <= 5;
  const activeEditMode = !hasRated || isEditing;

  const handleStarClick = async (e, starValue) => {
    e.stopPropagation();
    if (isSubmitting || typeof onRate !== 'function') return;
    setIsSubmitting(true);
    try {
      await onRate(starValue);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const starSize = variant === 'detailed' ? 20 : 16;

  if (activeEditMode) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: variant === 'detailed' ? '6px 12px' : '4px 8px',
        }}
        title={hasRated ? 'Select new star rating (1-5)' : 'Rate effectiveness (1-5 stars)'}
      >
        <span
          style={{
            fontSize: variant === 'detailed' ? '0.8rem' : '0.7rem',
            fontWeight: 700,
            color: '#92400e',
            marginRight: '2px',
            whiteSpace: 'nowrap',
          }}
        >
          {hasRated ? 'Edit:' : 'Rate:'}
        </span>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = (hoverRating || Number(myRating) || 0) >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={isSubmitting}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={(e) => handleStarClick(e, star)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px',
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.12s ease',
                transform: hoverRating === star ? 'scale(1.18)' : 'scale(1)',
              }}
              title={`Rate ${star} out of 5 stars`}
            >
              <Star
                size={starSize}
                color={filled ? '#eab308' : '#cbd5e1'}
                fill={filled ? '#eab308' : 'transparent'}
              />
            </button>
          );
        })}
        {hasRated && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(false);
              setHoverRating(0);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              marginLeft: '2px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Cancel editing rating"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: variant === 'detailed' ? '6px 12px' : '4px 8px',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
        }}
        title={`You rated ${myRating} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = Number(myRating) >= star;
          return (
            <Star
              key={star}
              size={starSize - 1}
              color={filled ? '#eab308' : '#cbd5e1'}
              fill={filled ? '#eab308' : 'transparent'}
            />
          );
        })}
      </div>

      <span
        style={{
          fontSize: variant === 'detailed' ? '0.82rem' : '0.75rem',
          fontWeight: 700,
          color: '#334155',
          whiteSpace: 'nowrap',
        }}
      >
        {myRating}/5
      </span>

      {Number(ratingsCount) > 0 && averageRating != null && (
        <span
          style={{
            fontSize: variant === 'detailed' ? '0.75rem' : '0.68rem',
            fontWeight: 600,
            color: '#64748b',
            background: '#f1f5f9',
            padding: '1px 5px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
          }}
          title={`Overall average: ${Number(averageRating).toFixed(2)} / 5 from ${ratingsCount} user(s)`}
        >
          Avg {Number(averageRating).toFixed(1)}★ ({ratingsCount})
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px 4px',
          cursor: 'pointer',
          color: '#0f766e',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.72rem',
          fontWeight: 600,
          borderRadius: '4px',
        }}
        title="Edit your star rating"
      >
        <SquarePen size={13} />
        {variant === 'detailed' && <span>Edit</span>}
      </button>
    </div>
  );
};

export default StarRatingAction;
