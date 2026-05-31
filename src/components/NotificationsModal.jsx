import NotificationPanel from '@/components/NotificationPanel'
import useNotifications from '@/hooks/useNotifications'

export default function NotificationsModal({
  isOpen,
  onClose,
  onUnreadCountChange,
  onRefreshUnreadCount,
  currentUserId,
  onOpenReport,
}) {
  const {
    notifications,
    loading,
    error,
    markOneAsRead,
    markAllAsRead,
  } = useNotifications({
    isOpen,
    currentUserId,
    onRefreshUnreadCount,
    onUnreadCountChange,
  })

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop notifications-backdrop" onClick={onClose}>
      <NotificationPanel
        notifications={notifications}
        loading={loading}
        error={error}
        onClose={onClose}
        onOpenReport={onOpenReport}
        onMarkOneAsRead={markOneAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </div>
  )
}
