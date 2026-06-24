import { Bell, CheckCheck, Clock3, X } from 'lucide-react'
import { useState } from 'react'
import StarRating from '../UI/StarRating'
import { rateReport } from '@/services/ncrService'

function formatNotificationDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function typeLabel(type) {
  const normalized = String(type || 'info').trim().toLowerCase()
  if (normalized === 'warning') return 'Warning'
  if (normalized === 'overdue') return 'Overdue'
  if (normalized === 'success') return 'Success'
  return 'Info'
}

export default function NotificationPanel({
  notifications,
  loading,
  error,
  onClose,
  onOpenReport,
  onMarkOneAsRead,
  onMarkAllAsRead,
}) {
  const list = Array.isArray(notifications) ? notifications : []
  const [ratingError, setRatingError] = useState(null)
  const [submittingRatingId, setSubmittingRatingId] = useState(null)

  const handleInlineRating = async (notification, ratingValue) => {
    if (!notification.report_id) return
    setRatingError(null)
    setSubmittingRatingId(notification.id)
    try {
      await rateReport(notification.report_id, ratingValue)
      // Once rating is successfully submitted, automatically dismiss the notification
      onMarkOneAsRead(notification.id)
    } catch (err) {
      setRatingError(err?.message || 'Failed to submit rating.')
    } finally {
      setSubmittingRatingId(null)
    }
  }

  return (
    <div className="notification-floating-dropdown">
      <div
        className="modal notifications-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        onClick={(event) => event.stopPropagation()}
      >
      <div className="modal-header notifications-modal-header">
        <div className="notifications-title-cluster">
          <span className="notifications-modal-icon"><Bell size={18} /></span>
          <div>
            <h2 id="notifications-title" className="modal-title">
              Notifications
            </h2>
            <p className="notifications-modal-subtitle">
              {list.length} unread item{list.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="notifications-header-actions">
          {list.length > 0 ? (
            <button className="notifications-mark-all" type="button" onClick={onMarkAllAsRead}>
              <CheckCheck size={16} />
              Mark all as read
            </button>
          ) : null}
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close notifications">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {loading ? <p className="modal-message loading">Loading unread notifications...</p> : null}
        {error ? <p className="modal-message error">{error}</p> : null}

        {!loading && !error && list.length === 0 ? (
          <div className="notifications-empty-state">
            <Clock3 size={22} />
            <p>No unread notifications right now.</p>
          </div>
        ) : null}

        {!loading && !error && list.map((notification) => (
          <article
            key={notification.id}
            className="notification-card"
            onClick={() => {
              if (onOpenReport) {
                onOpenReport(notification.report_id || null, notification)
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && onOpenReport) {
                event.preventDefault()
                onOpenReport(notification.report_id || null, notification)
              }
            }}
            style={{ cursor: onOpenReport ? 'pointer' : 'default' }}
          >
            <div className={`notification-pill notification-pill--${String(notification.type || 'info').trim().toLowerCase()}`}>
              {typeLabel(notification.type)}
            </div>
            <div className="notification-card-body">
              <h3 className="notification-card-title">{notification.title}</h3>
              <p className="notification-card-message">{notification.message}</p>
              
              {String(notification.title || '').startsWith('Report Approved:') && (
                <div className="notification-inline-rating" style={{ marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Rate effectiveness to dismiss:
                  </span>
                  <StarRating 
                    rating={0} 
                    onRatingChange={(val) => handleInlineRating(notification, val)} 
                    readOnly={submittingRatingId === notification.id}
                  />
                  {submittingRatingId === notification.id && <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '8px' }}>Submitting...</span>}
                  {ratingError && <span style={{ fontSize: '11px', color: 'var(--error, #ef4444)', marginLeft: '8px' }}>{ratingError}</span>}
                </div>
              )}

              <div className="notification-card-meta">
                <span>{formatNotificationDate(notification.created_at) || 'Just now'}</span>
                {notification.report_id ? <span>Report #{notification.report_id}</span> : null}
              </div>
            </div>
            <button
              type="button"
              className="notification-mark-read"
              onClick={(event) => {
                event.stopPropagation()
                onMarkOneAsRead(notification.id)
              }}
            >
              Mark as read
            </button>
          </article>
        ))}
      </div>
    </div>
    </div>
  )
}
