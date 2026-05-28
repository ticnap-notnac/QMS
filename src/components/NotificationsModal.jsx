import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

function NotificationsModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setNotifications(data || [])
      } catch (err) {
        setError(err.message)
        console.error('Error fetching notifications:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="notifications-title" className="modal-title">
            Notifications
          </h2>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
          >
            ×
          </button>
        </div>
        
        <div className="notifications-list">
          {loading && <p className="modal-message loading">Loading notifications...</p>}
          {error && <p className="modal-message error">Error: {error}</p>}
          
          {notifications.length === 0 && !loading ? (
            <p className="modal-message">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="notification-item">
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                
                <div className="notification-reviewers">
                  {notification.reviewers?.map((reviewer, idx) => (
                    <div key={idx} className="reviewer">
                      <div className="reviewer-avatar"></div>
                      <span className="reviewer-name">{reviewer.name}</span>
                    </div>
                  ))}
                  <button className="verify-btn" type="button">
                    {notification.action_text || 'Mark as Read'}
                  </button>
                </div>

                <div className="notification-charts">
                  <div className="notification-chart"></div>
                  <div className="notification-chart"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationsModal
