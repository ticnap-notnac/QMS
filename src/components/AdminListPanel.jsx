import React from 'react'
import { Pencil, Trash2 } from 'lucide-react' // ✏️🗑️ Brought in our sleek icons to replace text layout blocks
import '../pages/AdminPanel.css' // 📁 Steps up out of components/ and into pages/ where the file lives!

export default function AdminListPanel({
  title,
  items = [],
  loading = false,
  labelKey = 'name',
  onEdit, // 🔌 Wire up onEdit to cleanly support updating Departments, Roles, and Locations!
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
                
                {/* 🎯 Layout context cluster wrapper to securely house multiple side-by-side action points */}
                <div className="admin-actions-cell">
                  
                  {/* ✏️ Pencil Icon Button for Modifying Entries */}
                  {onEdit && (
                    <button
                      type="button"
                      className="btn-edit-user"
                      onClick={() => onEdit(item)}
                      title={`Edit ${title || 'Item'}`}
                    >
                      <Pencil size={14} />
                    </button>
                  )}

                  {/* 🗑️ Trash Bin Icon Button for Deleting Entries */}
                  <button
                    type="button"
                    className="btn-delete-user"
                    onClick={() => onDelete(item)}
                    disabled={isDeleting}
                    title={`Delete ${title || 'Item'}`}
                  >
                    <Trash2 size={14} />
                  </button>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}