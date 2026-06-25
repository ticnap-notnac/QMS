import React, { forwardRef } from 'react'
import './print.css'

const NCRPrintTemplate = forwardRef(({ report }, ref) => {
  if (!report) return null

  const occurrenceDate = report.occurrence_date
    ? new Date(report.occurrence_date).toLocaleDateString()
    : (report.created_at ? new Date(report.created_at).toLocaleDateString() : '')

  return (
    <div ref={ref} className="print-template-container">
      <div className="print-header">
        <div className="print-title">NON-CONFORMANCE REPORT (NCR)</div>
      </div>

      <table className="print-grid">
        <tbody>
          <tr>
            <td style={{ width: '33%' }}>
              <span className="print-label">Reporting Department:</span>
              <span className="print-value">{report.department_id || '—'}</span>
            </td>
            <td style={{ width: '33%' }}>
              <span className="print-label">Reporter:</span>
              <span className="print-value">{report.users?.full_name || report.user_id || '—'}</span>
            </td>
            <td style={{ width: '34%' }}>
              <span className="print-label">Date:</span>
              <span className="print-value">{occurrenceDate}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span className="print-label">Location:</span>
              <span className="print-value">{report.location_name || report.complaint_location || '—'}</span>
            </td>
            <td>
              <span className="print-label">Assigned To:</span>
              <span className="print-value">{report.assignee_users?.full_name || report.assigned_to || '—'}</span>
            </td>
            <td>
              <span className="print-label">NCR No.:</span>
              <span className="print-value">{report.reference_no || '—'}</span>
            </td>
          </tr>

          <tr>
            <td colSpan="3" className="print-section-title">
              ISSUE CLASSIFICATION
            </td>
          </tr>
          <tr>
            <td colSpan="2" style={{ padding: '15px' }}>
              <span className="print-label">Issue Category:</span>
              <span className="print-value" style={{ display: 'block', marginBottom: '10px' }}>{report.issue_type_name || report.issue_type || report.issue_category || '—'}</span>

              <span className="print-label">Severity Level:</span>
              <span className="print-value">{report.severity || '—'}</span>
            </td>
            <td style={{ padding: 0 }}>
              <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }}>
                      <div style={{ fontSize: '10px' }}>Product Type:</div>
                      <div style={{ fontSize: '12px', minHeight: '20px' }}>{report.product_type_name || report.product_type || ''}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '4px' }}>
                      <div style={{ fontSize: '10px' }}>Batch Number:</div>
                      <div style={{ fontSize: '12px', minHeight: '20px' }}>{report.batch_number || ''}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td colSpan="3" className="print-section-title-dark">
              DETAILS OF NON-CONFORMANCE
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={{ padding: '15px' }}>
              <div className="details-text" style={{ minHeight: '150px' }}>
                {report.description || 'No description provided.'}
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan="3" className="print-section-title-dark">
              INVESTIGATION & RESOLUTION DETAILS
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={{ padding: '15px' }}>
              <div className="details-text" style={{ minHeight: '150px' }}>
                <strong>Investigation Details:</strong><br />
                {report.investigation_details || 'Pending investigation.'}
                <br /><br />
                <strong>Resolution Details:</strong><br />
                {report.resolution_details || 'Pending resolution.'}
              </div>
            </td>
          </tr>

          <tr>
            <td style={{ padding: '10px' }}>
              <span className="print-label">Reported Date:</span>
              <div style={{ marginTop: '20px', borderBottom: '1px solid #000', width: '80%' }}>
                {occurrenceDate}
              </div>
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
              <div className="signature-box">
                <div style={{ fontSize: '16px', fontFamily: 'cursive', marginBottom: '10px' }}>
                  {report.users?.full_name || report.user_id}
                </div>
                <div className="signature-line"></div>
                <div className="signature-name">{report.users?.full_name || report.user_id}</div>
                <div className="signature-role">Reporter</div>
              </div>
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
              <div className="signature-box">
                <div style={{ fontSize: '16px', fontFamily: 'cursive', marginBottom: '10px' }}>
                  {report.assignee_users?.full_name || report.assigned_to || 'Pending'}
                </div>
                <div className="signature-line"></div>
                <div className="signature-name">{report.assignee_users?.full_name || report.assigned_to || ''}</div>
                <div className="signature-role">Assigned Investigator</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
})

NCRPrintTemplate.displayName = 'NCRPrintTemplate'

export default NCRPrintTemplate
