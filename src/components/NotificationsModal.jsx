import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Clock3, X } from 'lucide-react'
import { fetchUnreadNotifications, markNotificationAsRead } from '@/services/notificationService'

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

export default function NotificationsModal({
  isOpen,
  onClose,
  onUnreadCountChange,
  onRefreshUnreadCount,
  currentUserId,
  onOpenReport,
}) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    let active = true

    const loadNotifications = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchUnreadNotifications(currentUserId)
        if (!active) return

        setNotifications(Array.isArray(data) ? data : [])
        if (onRefreshUnreadCount) {
          await onRefreshUnreadCount()
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Failed to load notifications.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      active = false
    }
  }, [isOpen, currentUserId, onRefreshUnreadCount])

  const markOneAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId))
      if (onUnreadCountChange) {
        onUnreadCountChange((current) => Math.max(Number(current || 0) - 1, 0))
      }
      if (onRefreshUnreadCount) {
        await onRefreshUnreadCount()
      }
    } catch (err) {
      setError(err?.message || 'Failed to mark notification as read.')
    }
  }

  const markAllAsRead = async () => {
    try {
      await Promise.all(notifications.map((notification) => markNotificationAsRead(notification.id)))
      setNotifications([])
      if (onUnreadCountChange) {
        onUnreadCountChange(0)
      }
      if (onRefreshUnreadCount) {
        await onRefreshUnreadCount()
      }
    } catch (err) {
      setError(err?.message || 'Failed to mark notifications as read.')
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop notifications-backdrop" onClick={onClose}>
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
                {notifications.length} unread item{notifications.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="notifications-header-actions">
            {notifications.length > 0 ? (
              <button className="notifications-mark-all" type="button" onClick={markAllAsRead}>
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

          {!loading && !error && notifications.length === 0 ? (
            <div className="notifications-empty-state">
              <Clock3 size={22} />
              <p>No unread notifications right now.</p>
            </div>
          ) : null}

          {!loading && !error && notifications.map((notification) => (
            <article
              key={notification.id}
              className="notification-card"
              onClick={() => {
                if (notification.report_id && onOpenReport) {
                  onOpenReport(notification.report_id)
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && notification.report_id && onOpenReport) {
                  event.preventDefault()
                  onOpenReport(notification.report_id)
                }
              }}
              style={{ cursor: notification.report_id && onOpenReport ? 'pointer' : 'default' }}
            >
              <div className={`notification-pill notification-pill--${String(notification.type || 'info').trim().toLowerCase()}`}>
                {typeLabel(notification.type)}
              </div>
              <div className="notification-card-body">
                <h3 className="notification-card-title">{notification.title}</h3>
                <p className="notification-card-message">{notification.message}</p>
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
                  markOneAsRead(notification.id)
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
