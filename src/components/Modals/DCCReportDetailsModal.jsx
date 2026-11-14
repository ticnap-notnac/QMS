import React, { useState, useEffect } from 'react'
import { X, FileText, Download, CheckCircle, AlertTriangle, Clock, Star, MapPin, Tag, User, Calendar, Building } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { rateCarReport } from '@/services/carService'
import { rateQddrReport } from '@/services/qddrService'
import StarRatingAction from '../UI/StarRatingAction.jsx'

const QDDR_CHECKBOX_FIELDS = [
  { key: 'holes_punctures', label: 'Holes & Punctures' },
  { key: 'deformed_torn', label: 'Deformed or Torn' },
  { key: 'open_carton', label: 'Open Carton' },
  { key: 'crushed_dented', label: 'Crushed or Dented' },
  { key: 'wet_leaked', label: 'Wet or Leaked' },
  { key: 'stain_graffiti', label: 'Stain or Graffiti' },
  { key: 'bulging', label: 'Bulging' },
  { key: 'improper_stretch_wrapping', label: 'Improper Stretch Wrapping' },
  { key: 'wrong_no_batchcode', label: 'Wrong/No Batchcode' },
  { key: 'opened_seal', label: 'Opened Seal' },
  { key: 'no_label_broken_label', label: 'No Label/Broken Label' },
  { key: 'short_pack', label: 'Short Pack' },
  { key: 'excess_shipment', label: 'Excess Shipment' },
  { key: 'documentation_error', label: 'Documentation Error' },
  { key: 'picking_discrepancy', label: 'Picking Discrepancy' }
]

export default function DCCReportDetailsModal({ isOpen, onClose, document, onDownloadPDF }) {
  const { user: authUser } = useAuth()
  const [localMyRating, setLocalMyRating] = useState(null)
  const [localAvgRating, setLocalAvgRating] = useState(null)
  const [localRatingsCount, setLocalRatingsCount] = useState(0)

  useEffect(() => {
    if (document) {
      setLocalMyRating(document.my_rating ?? null)
      setLocalAvgRating(document.average_rating ?? null)
      setLocalRatingsCount(Number(document.ratings_count || 0))
    }
  }, [document])

  if (!isOpen || !document) return null

  const type = (document._type || 'REPORT').toUpperCase()
  const isQddr = type === 'QDDR'
  const isCar = type === 'CAR'
  const statusStr = String(document.status || 'OPEN').toUpperCase()
  const isClosed = statusStr === 'CLOSED' || statusStr === 'COMPLETED'
  const activeDiscrepancies = isQddr ? QDDR_CHECKBOX_FIELDS.filter(f => document[f.key]) : []
  const qddrDateStr = document.date
    ? `${String(document.date).split('T')[0]}${document.time ? ` ${String(document.time).slice(0, 5)}` : ''}`
    : (document.occurrence_date || document.created_at?.split('T')[0] || '—')

  const handleDccRate = async (starValue) => {
    const authId = authUser?.id
    if (!authId) return
    const res = isQddr
      ? await rateQddrReport(document.id, starValue, authId)
      : isCar
        ? await rateCarReport(document.id, starValue, authId)
        : null
    if (res) {
      setLocalMyRating(res.my_rating ?? starValue)
      setLocalAvgRating(res.average_rating ?? starValue)
      setLocalRatingsCount(res.ratings_count ?? 1)
    }
  }

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="modal-card" style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        transform: 'translateZ(0)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#1A435A',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A435A', margin: 0 }}>
                  {document.reference_no || document.title || 'Document Details'}
                </h2>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#e2e8f0',
                  color: '#334155'
                }}>
                  {type}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: isClosed ? '#dcfce7' : '#fef3c7',
                  color: isClosed ? '#166534' : '#92400e'
                }}>
                  {statusStr}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Document Control Center Record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Metadata Grid */}
          {isQddr ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Location</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.location || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Date &amp; Time</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{qddrDateStr}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Brand / Supplier</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.brand_supplier || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Material Description</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.material_description || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Material Code</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.material_code || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Batch / ISU No. &amp; Qty</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>
                    {document.batch_code_su_number || '—'}{document.qty !== null && document.qty !== undefined && document.qty !== '' ? ` (Qty: ${document.qty})` : ''}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>PO Reference</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.po_reference || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>DR / WB Number</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.drwb_number || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Trucker / Broker</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.trucker_broker || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Plate / Container No.</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>
                    {[document.plate_number, document.container_number].filter(Boolean).join(' / ') || '—'}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Department</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.department_name || document.department || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Location</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.complaint_location || document.location_name || document.location || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Product Type</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.product_type || document.product_type_name || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Batch Number</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.batch_number || '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color={document.severity === 'HIGH' ? '#dc2626' : document.severity === 'MEDIUM' ? '#d97706' : '#2563eb'} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Severity</span>
                  <strong style={{ fontSize: '0.875rem', color: document.severity === 'HIGH' ? '#dc2626' : document.severity === 'MEDIUM' ? '#d97706' : '#2563eb' }}>
                    {document.severity || '—'}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Occurrence Date</span>
                  <strong style={{ fontSize: '0.875rem', color: '#1A435A' }}>{document.occurrence_date || document.created_at?.split('T')[0] || '—'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Discrepancy Checkboxes for QDDR */}
          {isQddr && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Types of Discrepancy Checked
              </h4>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {activeDiscrepancies.length > 0 ? (
                  activeDiscrepancies.map(f => (
                    <span key={f.key} style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#dc2626',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {f.label}
                    </span>
                  ))
                ) : (
                  !document.others && <span style={{ color: '#64748b', fontSize: '0.85rem' }}>None checked</span>
                )}
                {document.others && (
                  <span style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}>
                    Other: {document.others}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Description / Reason of Discrepancy Section */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isQddr ? 'Reason of Discrepancy' : 'Details of Non-Conformance / Description'}
            </h4>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.9rem',
              color: '#1e293b',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {document.reason_of_discrepancy || document.description || document.details_of_nonconformance || 'No description provided.'}
            </div>
          </div>

          {/* Evidence / Attachments */}
          {Array.isArray(document.evidence_urls) && document.evidence_urls.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Evidence / Attachments ({document.evidence_urls.length})
              </h4>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {document.evidence_urls.map((url, idx) => {
                  const lower = String(url || '').toLowerCase()
                  const isImg = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower) || lower.startsWith('data:image/')
                  const label = url.startsWith('data:')
                    ? `Evidence Photo ${idx + 1}`
                    : decodeURIComponent(url.split('/').pop()?.split('?')[0] || `Attachment ${idx + 1}`)
                  return isImg ? (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Click to view full image"
                      style={{
                        display: 'block',
                        width: '120px',
                        height: '90px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc'
                      }}
                    >
                      <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ) : (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0891b2',
                        fontSize: '0.8rem',
                        fontWeight: 500,
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

          {/* Investigation & Root Cause */}
          {(document.investigation_details || document.investigation) && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Investigation & Root Cause Analysis
              </h4>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.9rem',
                color: '#334155',
                lineHeight: 1.6
              }}>
                {document.investigation_details || document.investigation}
              </div>
            </div>
          )}

          {/* Corrective Action */}
          {(document.corrective_action || document.corrective_actions) && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Corrective Action Taken
              </h4>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.9rem',
                color: '#166534',
                lineHeight: 1.6
              }}>
                {document.corrective_action || document.corrective_actions}
              </div>
            </div>
          )}

          {/* Preventive Action / Resolution */}
          {(document.resolution_details || document.preventive_action) && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Preventive Action &amp; Resolution Details
              </h4>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.9rem',
                color: '#1e40af',
                lineHeight: 1.6
              }}>
                {document.resolution_details || document.preventive_action}
              </div>
            </div>
          )}

          {/* QDDR Signatories */}
          {isQddr && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Reported By</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1A435A' }}>{document.reported_by_name || document.reported_by || '—'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Leader / Supervisor</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1A435A' }}>{document.leader_name || document.leader || '—'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Approved By</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1A435A' }}>{document.approved_by_name || document.approved_by || '—'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="#64748b" />
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Noted By</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1A435A' }}>{document.noted_by_name || document.noted_by || '—'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Performance Metrics */}
          {(document.resolution_time || document.preventive_rating || document.verification_date) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '12px 16px',
              background: '#f1f5f9',
              borderRadius: '8px',
              alignItems: 'center'
            }}>
              {document.resolution_time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} color="#475569" />
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    Resolution Time: <strong>{document.resolution_time}</strong>
                  </span>
                </div>
              )}

              {document.preventive_rating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={15} color="#eab308" fill="#eab308" />
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    Preventive Rating: <strong>{document.preventive_rating}</strong>
                  </span>
                </div>
              )}

              {document.verification_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={15} color="#16a34a" />
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    Verified Closed: <strong>{document.verification_date}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Multi-User 5-Star Rating Section for Closed QDDR / CAR in DCC */}
          {isClosed && (isQddr || isCar) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '14px 16px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={15} color="#eab308" fill="#eab308" /> Rate Resolution Effectiveness (CBR Feedback)
                </span>
                <span style={{ fontSize: '0.78rem', color: '#b45309' }}>
                  Your 1–5 star rating updates the overall case effectiveness score for future CBR suggestions.
                </span>
              </div>
              <StarRatingAction
                myRating={localMyRating}
                averageRating={localAvgRating}
                ratingsCount={localRatingsCount}
                onRate={handleDccRate}
                variant="detailed"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px'
        }}>
          {onDownloadPDF ? (
            <button
              onClick={() => onDownloadPDF(document, type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <Download size={16} /> Export PDF Report
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: '#1A435A',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
