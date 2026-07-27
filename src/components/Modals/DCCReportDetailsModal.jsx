import React from 'react'
import { X, FileText, Download, CheckCircle, AlertTriangle, Clock, Star, MapPin, Tag, User, Calendar, Building } from 'lucide-react'

export default function DCCReportDetailsModal({ isOpen, onClose, document, onDownloadPDF }) {
  if (!isOpen || !document) return null

  const type = (document._type || 'REPORT').toUpperCase()
  const statusStr = String(document.status || 'OPEN').toUpperCase()
  const isClosed = statusStr === 'CLOSED' || statusStr === 'COMPLETED'

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
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
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
                <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{document.department_name || document.department || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="#64748b" />
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Location</span>
                <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{document.complaint_location || document.location_name || document.location || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={16} color="#64748b" />
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Product Type</span>
                <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{document.product_type || document.product_type_name || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#64748b" />
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Batch Number</span>
                <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{document.batch_number || '—'}</strong>
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
                <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{document.occurrence_date || document.created_at?.split('T')[0] || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Details of Non-Conformance / Description
            </h4>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.9rem',
              color: '#1e293b',
              lineHeight: 1.6
            }}>
              {document.description || document.details_of_nonconformance || 'No description provided.'}
            </div>
          </div>

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
                Preventive Action & Resolution Details
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
                    Preventive Rating: <strong>{document.preventive_rating} / 5 Stars</strong>
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
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
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
              background: '#0f172a',
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
