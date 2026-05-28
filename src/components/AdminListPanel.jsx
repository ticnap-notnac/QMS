import React from 'react'

export default function AdminListPanel({
  title,
  items = [],
  loading = false,
  labelKey = 'name',
  onDelete = () => {},
  deletingId = null,
  noMatchesText = 'No matches found.',
}) {
  return (
    <div className="admin-list-panel">
      <div className="admin-list-panel-header">
        <h4 className="glass-card-subtext">{title}</h4>
        <span>{items.length}</span>
      </div>

      {loading ? (
        <p className="glass-card-subtext">Loading...</p>
      ) : items.length === 0 ? (
        <p className="glass-card-subtext">{noMatchesText}</p>
      ) : (
        <div className="admin-list-items">
          {items.map((item) => {
            const label = item[labelKey] || ''
            const isDeleting = String(deletingId) === String(item.id)

            return (
              <div className="admin-list-item" key={item.id}>
                <span>{label}</span>
                <button
                  type="button"
                  className="btn-delete-user"
                  onClick={() => onDelete(item)}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
