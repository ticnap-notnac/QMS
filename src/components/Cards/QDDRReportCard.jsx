import React, { useState } from 'react'
import { User, SquarePen, Trash2, CheckCircle2, Camera } from 'lucide-react'
import StarRatingAction from '../UI/StarRatingAction.jsx'
import ImageLightboxModal from '../Modals/ImageLightboxModal.jsx'

function QDDRReportCard({ qddr, canEdit, onSelectQddr, onEditQddr, onDeleteQddr, onRateQddr, isNewlySubmitted }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const statusClean = String(qddr.status || '').trim().toLowerCase()
  const isClosed = statusClean === 'closed'
  const isUnderVerification = statusClean === 'under_verification'

  let statusBg = '#f1f5f9'
  let statusColor = '#475569'
  let statusBorder = '1px solid #cbd5e1'
  let statusText = 'OPEN'

  if (isClosed) {
    statusBg = '#f0fdf4'
    statusColor = '#166534'
    statusBorder = '1px solid #bbf7d0'
    statusText = 'CLOSED'
  } else if (isUnderVerification) {
    statusBg = '#eff6ff'
    statusColor = '#1e40af'
    statusBorder = '1px solid #bfdbfe'
    statusText = 'UNDER VERIFICATION'
  } else {
    statusBg = '#fef2f2'
    statusColor = '#991b1b'
    statusBorder = '1px solid #fecaca'
    statusText = 'OPEN'
  }

  const unifiedBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '95px',
    height: '28px',
    padding: '0 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textAlign: 'center',
    boxSizing: 'border-box'
  }

  const dateTimeStr = qddr.date 
    ? `${new Date(qddr.date).toLocaleDateString()}${qddr.time ? ` ${qddr.time.slice(0, 5)}` : ''}`
    : '—'

  return (
    <div className={`reports-card ${isNewlySubmitted ? 'newly-submitted' : ''}`} id={`qddr-report-card-${qddr.id}`} onClick={() => onSelectQddr && onSelectQddr(qddr)} style={{ cursor: onSelectQddr ? 'pointer' : 'default' }}>
      {/* Header */}
      <div className="reports-card-header">
        <div className="reports-user-block">
          <div className="reports-avatar">
            <User size={20} color="#1A435A" />
          </div>
          <div className="reports-user-text">
            <span className="reports-user-name">
              {qddr.reference_no?.trim() || `QDDR-${qddr.id}`}
            </span>
            <span className="reports-user-meta">
              {qddr.location?.trim() || '—'} • {dateTimeStr}
            </span>
          </div>
        </div>
        <div className="badges-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isNewlySubmitted && (
            <span className="newly-submitted-badge">
              <CheckCircle2 size={13} style={{ marginRight: '4px' }} /> Just Submitted
            </span>
          )}
          <span style={{ ...unifiedBadgeStyle, background: statusBg, color: statusColor, border: statusBorder }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Details Section */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Details</h4>
      </div>
      
      <div className="reports-grid-2-col">
        <div>
          <div className="reports-label-small">Trucker / Broker</div>
          <div className="reports-value-text">{qddr.trucker_broker?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Plate No.</div>
          <div className="reports-value-text">{qddr.plate_number?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">PO Reference</div>
          <div className="reports-value-text">{qddr.po_reference?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Material Code</div>
          <div className="reports-value-text">{qddr.material_code?.trim() || '—'}</div>
        </div>
        <div className="grid-col-span-2">
          <div className="reports-label-small">Material Description</div>
          <div className="reports-value-text">{qddr.material_description?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Qty</div>
          <div className="reports-value-text">{String(qddr.qty ?? '').trim() || '—'}</div>
        </div>
      </div>

      <div className="reports-section-label">
        <div className="reports-label-small">Reason of Discrepancy</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {qddr.reason_of_discrepancy || 'No details provided.'}
        </span>
      </div>

      {/* Evidence / Attachments */}
      {Array.isArray(qddr.evidence_urls) && qddr.evidence_urls.length > 0 && (
        <div style={{ marginTop: '14px', marginBottom: '14px' }}>
          <div className="reports-section-label" style={{ marginBottom: '8px' }}>
            <div className="reports-label-small" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={14} color="#0891b2" /> Evidence / Attachments ({qddr.evidence_urls.length})
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: qddr.evidence_urls.length === 1 
              ? 'minmax(0, 600px)' 
              : 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {qddr.evidence_urls.map((url, idx) => {
              const lower = String(url || '').toLowerCase()
              const isImg = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower) || lower.startsWith('data:image/')
              const label = url.startsWith('data:')
                ? `Evidence Photo ${idx + 1}`
                : decodeURIComponent(url.split('/').pop()?.split('?')[0] || `Attachment ${idx + 1}`)

              return isImg ? (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(idx)
                  }}
                  title="Click to expand image"
                  style={{
                    position: 'relative',
                    height: qddr.evidence_urls.length === 1 ? '360px' : '260px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.015)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'
                  }}
                >
                  <img
                    src={url}
                    alt={label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '8px 12px',
                    background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.75))',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '11px', opacity: 0.9, flexShrink: 0, marginLeft: '8px' }}>
                      🔍 Click to expand
                    </span>
                  </div>
                </div>
              ) : (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0891b2',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  📄 {label}
                </a>
              )
            })}
          </div>
        </div>
      )}

      <div className="reports-section-label">
        <div className="reports-label-small">Corrective Action</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {qddr.corrective_action || 'No details provided.'}
        </span>
      </div>

      <div className="reports-section-label">
        <div className="reports-label-small">Preventive Action</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {qddr.preventive_action || 'No details provided.'}
        </span>
      </div>

      {/* Action row */}
      {isClosed ? (
        <div className="action-btn-row" onClick={(e) => e.stopPropagation()}>
          <StarRatingAction
            myRating={qddr.my_rating}
            averageRating={qddr.average_rating}
            ratingsCount={qddr.ratings_count}
            onRate={(rating) => onRateQddr && onRateQddr(qddr.id, rating)}
          />
        </div>
      ) : canEdit ? (
        <div className="action-btn-row" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn-action-icon"
            onClick={() => onEditQddr && onEditQddr(qddr)}
            title="Edit report"
          >
            <SquarePen size={16} />
          </button>
          <button
            type="button"
            className="btn-action-icon-danger"
            onClick={() => onDeleteQddr && onDeleteQddr(qddr.id)}
            title="Delete report"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : null}

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={qddr.evidence_urls}
        initialIndex={lightboxIndex ?? 0}
        title={qddr.control_no || `QDDR-${qddr.id}`}
      />
    </div>
  )
}

export default QDDRReportCard
