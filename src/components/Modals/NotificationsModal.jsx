import React from 'react'
import { createPortal } from 'react-dom' // 🌀 Import the React Portal teleportation engine
import NotificationPanel from '@/components/Panels/NotificationPanel'
import useNotifications from '@/hooks/useNotifications'
import '../components.css' // Or whichever style file handles your component UI

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

  // 🛑 Early exit if the panel isn't toggled open
  if (!isOpen) return null

  // 📦 The layout markup block we want to render
  const modalContent = (
    <div className="notification-portal-overlay" onClick={onClose}>
      {/* Stops clicks inside the actual card from accidentally closing the window */}
      <div className="notification-modal-card" onClick={(e) => e.stopPropagation()}>
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
    </div>
  )

  // 🚀 Teleport the code straight out of the navbar and append it to the main HTML document body
  return createPortal(modalContent, document.body)
}
