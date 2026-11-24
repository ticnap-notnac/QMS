import React, { useState } from 'react'
import { User, SquarePen, Trash2, CheckCircle2, Camera } from 'lucide-react'
import { formatDate, getStatusStyle } from '@/utils/themeHelpers'
import { REPORT_STATUS } from '../../../shared/constants'
import StarRatingAction from '../UI/StarRatingAction.jsx'
import ImageLightboxModal from '../Modals/ImageLightboxModal.jsx'

function CARReportCard({ car, canEdit, onSelectCar, onEditCar, onDeleteCar, onRateCar, isNewlySubmitted }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const requestor = car.requestor?.trim() || 'Requestor'
  const recipient = car.recipient?.trim() || 'Recipient'
  const reqDept = car.requesting_department?.trim() || 'Requesting Dept'
  const respDept = car.responsible_department?.trim() || 'Responsible Dept'
  
  const statusClean = String(car.status || '').trim().toLowerCase()
  const isClosed = statusClean === 'closed'
  const isUnderVerification = statusClean === 'under_verification'

  const issueTypeStr = car.type_of_nonconformance || car.others || '—'

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

  return (
    <div className={`reports-card ${isNewlySubmitted ? 'newly-submitted' : ''}`} id={`car-report-card-${car.id}`} onClick={() => onSelectCar && onSelectCar(car)} style={{ cursor: onSelectCar ? 'pointer' : 'default' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="reports-card-header">
        <div className="reports-user-block">
          <div className="reports-avatar">
            <User size={20} color="#1A435A" />
          </div>
          <div className="reports-user-text">
            <span className="reports-user-name">
              {requestor}
              <span className="reports-ref-number">
                {car.reference_no?.trim() || `CAR-${car.id}`}
              </span>
            </span>
            <span className="reports-user-meta">
              {reqDept} (To: {recipient} - {respDept}) • {car.request_date ? new Date(car.request_date).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>

        <div className="badges-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isNewlySubmitted && (
            <span className="newly-submitted-badge">
              <CheckCircle2 size={13} style={{ marginRight: '4px' }} /> Just Submitted
            </span>
          )}
          {/* Status Badge */}
          <span style={{ ...unifiedBadgeStyle, background: statusBg, color: statusColor, border: statusBorder }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* ── Details Section ─────────────────────────────────────────────── */}
      <div className="reports-details-title-wrap">
        <h4 className="reports-details-title">Details</h4>
      </div>
      
      <div className="reports-grid-2-col">
        <div>
          <div className="reports-label-small">Product / Material</div>
          <div className="reports-value-text">{car.product_material_name?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Model / Type</div>
          <div className="reports-value-text">{car.model_type?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Control No.</div>
          <div className="reports-value-text">{car.control_no?.trim() || '—'}</div>
        </div>
        <div>
          <div className="reports-label-small">Affected Qty</div>
          <div className="reports-value-text">{String(car.affected_quantity ?? '').trim() || '—'}</div>
        </div>
        <div className="grid-col-span-2">
          <div className="reports-label-small">Issue Type</div>
          <div className="reports-value-text">{issueTypeStr}</div>
        </div>
      </div>

      <div className="reports-section-label">
        <div className="reports-label-small">Nonconformance Details</div>
      </div>
      <div className="reports-details-box">
        <span className="reports-workspace-text">
          {car.details_of_nonconformance || 'No details provided.'}
        </span>
      </div>

      {/* Evidence / Attachments */}
      {Array.isArray(car.evidence_urls) && car.evidence_urls.length > 0 && (
        <div style={{ marginTop: '14px', marginBottom: '14px' }}>
          <div className="reports-section-label" style={{ marginBottom: '8px' }}>
            <div className="reports-label-small" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={14} color="#0891b2" /> Evidence / Attachments ({car.evidence_urls.length})
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: car.evidence_urls.length === 1 
              ? 'minmax(0, 600px)' 
              : 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {car.evidence_urls.map((url, idx) => {
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
                    height: car.evidence_urls.length === 1 ? '360px' : '260px',
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

      {/* ── Action row ──────────────────────────────────────────────────── */}
      {isClosed ? (
        <div className="action-btn-row" onClick={(e) => e.stopPropagation()}>
          <StarRatingAction
            myRating={car.my_rating}
            averageRating={car.average_rating}
            ratingsCount={car.ratings_count}
            onRate={(rating) => onRateCar && onRateCar(car.id, rating)}
          />
        </div>
      ) : canEdit ? (
        <div className="action-btn-row" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn-action-icon"
            onClick={() => onEditCar && onEditCar(car)}
            title="Edit report"
          >
            <SquarePen size={16} />
          </button>
          <button
            type="button"
            className="btn-action-icon-danger"
            onClick={() => onDeleteCar && onDeleteCar(car.id)}
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
        images={car.evidence_urls}
        initialIndex={lightboxIndex ?? 0}
        title={car.car_number || `CAR-${car.id}`}
      />
    </div>
  )
}

export default CARReportCard
