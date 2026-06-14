import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import '../../pages/AdminPanel.css'

export default function AdminListPanel({
  title,
  items = [],
  loading = false,
  labelKey = 'name',
  onEdit,
  onDelete = () => { },
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
            const itemStatus = item?.status ? String(item.status).toLowerCase() : null

            return (
              <div className="admin-list-item" key={item.id}>

                {/* Text Label and Optional Color Status Badge Container Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>{label}</span>

                  {/* 🚀 Dynamic Status Badge: Active (Green), Inactive (Red), Deactivated (Orange) */}
                  {itemStatus && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        background:
                          itemStatus === 'active' ? 'rgba(16, 185, 129, 0.08)' :
                            itemStatus === 'inactive' ? 'rgba(239, 68, 68, 0.08)' :
                              'rgba(245, 158, 11, 0.08)',
                        color:
                          itemStatus === 'active' ? '#059669' :
                            itemStatus === 'inactive' ? '#dc2626' :
                              '#d97706',
                        border:
                          itemStatus === 'active' ? '1px solid rgba(16, 185, 129, 0.2)' :
                            itemStatus === 'inactive' ? '1px solid rgba(239, 68, 68, 0.2)' :
                              '1px solid rgba(245, 158, 11, 0.2)'
                      }}
                    >
                      {item.status}
                    </span>
                  )}
                </div>

                {/* 🎯 Layout context cluster wrapper to securely house multiple side-by-side action points */}
                <div className="admin-actions-cell" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                  {/* ✏️ Pencil Icon Button for Modifying Entries */}
                  {onEdit && (
                    <button
                      type="button"
                      className="btn-edit-user"
                      onClick={() => onEdit(item)}
                      title={`Edit ${title || 'Item'}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
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
