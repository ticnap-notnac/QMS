import React, { forwardRef } from 'react'
import './print.css'

const CARPrintTemplate = forwardRef(({ report }, ref) => {
  if (!report) return null

  const occurrenceDate = report.date
    ? new Date(report.date).toLocaleDateString()
    : (report.request_date
      ? new Date(report.request_date).toLocaleDateString()
      : (report.created_at ? new Date(report.created_at).toLocaleDateString() : ''))

  const requestDateFormatted = report.request_date
    ? new Date(report.request_date).toLocaleDateString()
    : occurrenceDate

  const isNoReply = Boolean(report.no_reply) || report.reason_for_reissue === 'No Reply' || report.reason_reissue === 'No Reply'
  const isReCorrectiveAction = Boolean(report.re_corrective_action) || report.reason_for_reissue === 'Re-Corrective Action' || report.reason_reissue === 'Re-Corrective Action'

  return (
    <div ref={ref} className="print-template-container">
      <div className="print-header">
        <div className="print-title">CORRECTIVE ACTION REQUEST (CAR)</div>
      </div>

      <table className="print-grid">
        <tbody>
          <tr>
            <td style={{ width: '33%' }}>
              <span className="print-label">Requesting Department:</span>
              <span className="print-value">{report.requesting_department || report.requesting_department_id || '—'}</span>
            </td>
            <td style={{ width: '33%' }}>
              <span className="print-label">Requestor:</span>
              <span className="print-value">{report.requestor || report.users?.full_name || report.user_id || '—'}</span>
            </td>
            <td style={{ width: '34%' }}>
              <span className="print-label">Date:</span>
              <span className="print-value">{occurrenceDate}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span className="print-label">Responsible Department:</span>
              <span className="print-value">{report.responsible_department || report.responsible_department_id || '—'}</span>
            </td>
            <td>
              <span className="print-label">Recipient:</span>
              <span className="print-value">{report.recipient || report.recipient_users?.full_name || report.recipient_user_id || '—'}</span>
            </td>
            <td>
              <span className="print-label">CAR No.:</span>
              <span className="print-value">{report.reference_no || '—'}</span>
              <div style={{ fontSize: '10px', marginTop: '2px' }}>(To be filled up by QA EHS Department)</div>
            </td>
          </tr>
          <tr>
            <td colSpan="3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span className="print-label" style={{ marginBottom: 0 }}>Reason for Re – issue:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div className="checkbox-item" style={{ marginBottom: 0 }}>
                    <div className={`checkbox-box ${isNoReply ? 'checked' : ''}`}></div> No Reply
                  </div>
                  <div className="checkbox-item" style={{ marginBottom: 0 }}>
                    <div className={`checkbox-box ${isReCorrectiveAction ? 'checked' : ''}`}></div> Re-Corrective Action
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="3" className="print-section-title">
              TYPE OF NON-CONFORMANCE: <span style={{ textTransform: 'none', fontWeight: 'bold' }}>{report.type_of_nonconformance || report.others || 'General'}</span>
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={{ padding: 0 }}>
              <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '6px' }}>
                      <div style={{ fontSize: '10px' }}>Product / material name:</div>
                      <div style={{ fontSize: '12px', minHeight: '20px' }}>{report.product_material_name || report.product_type_name || report.product_type || ''}</div>
                    </td>
                    <td style={{ borderBottom: '1px solid #000', padding: '6px' }}>
                      <div style={{ fontSize: '10px' }}>Model Type:</div>
                      <div style={{ fontSize: '12px', minHeight: '20px' }}>{report.model_type || ''}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '6px' }}>
                      <div style={{ fontSize: '10px' }}>Control no.:</div>
                      <div style={{ fontSize: '12px', minHeight: '20px' }}>{report.control_no || ''}</div>
                    </td>
                    <td style={{ borderBottom: '1px solid #000', padding: '6px' }}>
                      <div style={{ fontSize: '10px' }}>Affected Quantity:</div>
                      <div style={{ fontSize: '12px', minHeight: '20px' }}>{report.affected_quantity || ''}</div>
                    </td>
                  </tr>
                  {report.others && (
                    <tr>
                      <td colSpan="2" style={{ padding: '6px', borderBottom: '1px solid #000' }}>
                        <div style={{ fontSize: '10px' }}>Others / Remarks:</div>
                        <div style={{ fontSize: '12px' }}>{report.others}</div>
                      </td>
                    </tr>
                  )}
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
              <div className="details-text">
                {report.details_of_nonconformance || report.description || report.investigation_details || 'No details provided.'}
              </div>
            </td>
          </tr>
          {(report.root_cause_analysis || report.corrective_action || report.preventive_action) && (
            <>
              <tr>
                <td colSpan="3" className="print-section-title-dark">
                  CORRECTIVE &amp; PREVENTIVE ACTION PLAN (CAPA)
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ padding: '12px 15px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span className="print-label">Root Cause Analysis:</span>
                    <div className="details-text" style={{ minHeight: '30px' }}>{report.root_cause_analysis || '—'}</div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span className="print-label">Immediate Corrective Action:</span>
                    <div className="details-text" style={{ minHeight: '30px' }}>{report.corrective_action || '—'}</div>
                  </div>
                  <div>
                    <span className="print-label">Preventive Action:</span>
                    <div className="details-text" style={{ minHeight: '30px' }}>{report.preventive_action || '—'}</div>
                  </div>
                </td>
              </tr>
            </>
          )}
          {report.verification_notes && (
            <>
              <tr>
                <td colSpan="3" className="print-section-title">
                  VERIFICATION OF EFFECTIVENESS (VoE)
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ padding: '12px 15px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span className="print-label">Verification Notes:</span>
                    <div className="details-text" style={{ minHeight: '24px' }}>{report.verification_notes}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px' }}>
                    <span><strong>Effectiveness Rating:</strong> {report.verification_rating || '—'}</span>
                    <span><strong>Verified Date:</strong> {report.verification_date ? new Date(report.verification_date).toLocaleDateString() : '—'}</span>
                  </div>
                </td>
              </tr>
            </>
          )}
          <tr>
            <td style={{ padding: '10px' }}>
              <span className="print-label">Request Date:</span>
              <div style={{ marginTop: '20px', borderBottom: '1px solid #000', width: '80%' }}>
                {requestDateFormatted}
              </div>
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
              <div className="signature-box">
                <div style={{ fontSize: '16px', fontFamily: 'cursive', marginBottom: '10px' }}>
                  {report.requestor || report.users?.full_name || report.user_id}
                </div>
                <div className="signature-line"></div>
                <div className="signature-name">{report.requestor || report.users?.full_name || report.user_id}</div>
                <div className="signature-role">Initiator</div>
              </div>
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
              <div className="signature-box">
                <div style={{ fontSize: '16px', fontFamily: 'cursive', marginBottom: '10px' }}>
                  {report.recipient || report.recipient_users?.full_name || report.recipient_user_id || 'Pending'}
                </div>
                <div className="signature-name" style={{ marginTop: '20px' }}>(CAR Recipient's HOD):</div>
                <div className="signature-name">{report.recipient || report.recipient_users?.full_name || report.recipient_user_id || ''}</div>
                <div className="signature-role">Head of Department</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
})

CARPrintTemplate.displayName = 'CARPrintTemplate'

export default CARPrintTemplate
