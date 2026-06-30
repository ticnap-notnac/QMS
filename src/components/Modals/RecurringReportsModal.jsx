import React from 'react'
import { X, FileText } from 'lucide-react'
import { getLocalDateString } from '@/utils/date'

export default function RecurringReportsModal({ isOpen, onClose, reports = [] }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1)',
          maxHeight: '90vh'
        }}
      >
        <div 
          style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <FileText size={18} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 600 }}>
              Recurring Reports ({reports.length})
            </h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {reports.map((report) => (
            <div key={report.id} style={{
              padding: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong>{report.reference_no}</strong>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {getLocalDateString(report.created_at)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
                {report.description}
              </p>
              <div style={{ marginTop: '12px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  textTransform: 'uppercase'
                }}>
                  Status: {report.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button 
            type="button" 
            className="btn-secondary-light" 
            onClick={onClose} 
            style={{ margin: 0, padding: '8px 20px', fontSize: '13px', height: '36px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
