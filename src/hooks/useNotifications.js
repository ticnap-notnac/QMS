import { useCallback, useEffect, useState } from 'react'
import { fetchUnreadNotifications, markNotificationAsRead } from '@/services/notificationService'

export default function useNotifications({
  isOpen,
  currentUserId,
  onRefreshUnreadCount,
  onUnreadCountChange,
}) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadNotifications = useCallback(async () => {
    if (!currentUserId) {
      setNotifications([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchUnreadNotifications(currentUserId)
      setNotifications(Array.isArray(data) ? data : [])

      if (onRefreshUnreadCount) {
        await onRefreshUnreadCount()
      }
    } catch (err) {
      setError('We could not load your notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUserId, onRefreshUnreadCount])

  useEffect(() => {
    if (!isOpen) return
    loadNotifications()
  }, [isOpen, loadNotifications])

  const markOneAsRead = useCallback(async (notificationId) => {
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
      setError('The notification could not be marked as read. Please try again.')
    }
  }, [onRefreshUnreadCount, onUnreadCountChange])

  const markAllAsRead = useCallback(async () => {
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
      setError('We could not mark the notifications as read. Please try again.')
    }
  }, [notifications, onRefreshUnreadCount, onUnreadCountChange])

  return {
    notifications,
    loading,
    error,
    markOneAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  }
}
