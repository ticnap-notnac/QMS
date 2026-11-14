import React, { forwardRef } from 'react'
import './print.css'

const QDDR_DISCREPANCY_FLAGS = [
  { key: 'holes_punctures', label: 'HOLES & PUNCTURES' },
  { key: 'deformed_torn', label: 'DEFORMED OR TORN' },
  { key: 'open_carton', label: 'OPEN CARTON' },
  { key: 'crushed_dented', label: 'CRUSHED OR DENTED' },
  { key: 'wet_leaked', label: 'WET OR LEAKED' },
  { key: 'stain_graffiti', label: 'STAIN OR GRAFFITI' },
  { key: 'bulging', label: 'BULGING' },
  { key: 'improper_stretch_wrapping', label: 'IMPROPER STRETCH WRAPPING' },
  { key: 'wrong_no_batchcode', label: 'WRONG / NO BATCHCODE' },
  { key: 'opened_seal', label: 'OPENED SEAL' },
  { key: 'no_label_broken_label', label: 'NO LABEL / BROKEN LABEL' },
  { key: 'short_pack', label: 'SHORT PACK' },
  { key: 'excess_shipment', label: 'EXCESS SHIPMENT' },
  { key: 'documentation_error', label: 'DOCUMENTATION ERROR' },
  { key: 'picking_discrepancy', label: 'PICKING DISCREPANCY' },
]

const QDDRPrintTemplate = forwardRef(({ report }, ref) => {
  if (!report) return null

  const occurrenceDate = report.date
    ? new Date(report.date).toLocaleDateString()
    : (report.created_at ? new Date(report.created_at).toLocaleDateString() : '—')

  const reporterName = report.reported_by_name || report.users?.full_name || report.reported_by || '—'
  const leaderName = report.leader_name || report.leader || '—'
  const approvedByName = report.approved_by_name || report.approved_by || '—'
  const notedByName = report.noted_by_name || report.noted_by || '—'

  return (
    <div ref={ref} className="print-template-container">
      <div className="print-header">
        <div className="print-title">QUALITY DEFECTS / DAMAGED / DISCREPANCY REPORT (QDDR)</div>
      </div>

      <table className="print-grid">
        <tbody>
          <tr>
            <td style={{ width: '33%' }}>
              <span className="print-label">Location:</span>
              <span className="print-value">{report.location || '—'}</span>
            </td>
            <td style={{ width: '33%' }}>
              <span className="print-label">Date / Time:</span>
              <span className="print-value">{occurrenceDate}{report.time ? ` ${report.time}` : ''}</span>
            </td>
            <td style={{ width: '34%' }}>
              <span className="print-label">QDDR No.:</span>
              <span className="print-value">{report.reference_no || '—'}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span className="print-label">Trucker / Broker:</span>
              <span className="print-value">{report.trucker_broker || '—'}</span>
            </td>
            <td>
              <span className="print-label">Plate Number:</span>
              <span className="print-value">{report.plate_number || '—'}</span>
            </td>
            <td>
              <span className="print-label">Container Number:</span>
              <span className="print-value">{report.container_number || '—'}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span className="print-label">PO Reference:</span>
              <span className="print-value">{report.po_reference || '—'}</span>
            </td>
            <td>
              <span className="print-label">DR / WB Number:</span>
              <span className="print-value">{report.drwb_number || '—'}</span>
            </td>
            <td>
              <span className="print-label">Brand / Supplier:</span>
              <span className="print-value">{report.brand_supplier || '—'}</span>
            </td>
          </tr>

          <tr>
            <td colSpan="3" className="print-section-title">
              MATERIAL &amp; SHIPMENT DETAILS
            </td>
          </tr>
          <tr>
            <td>
              <span className="print-label">Material Description:</span>
              <span className="print-value">{report.material_description || '—'}</span>
            </td>
            <td>
              <span className="print-label">Material Code:</span>
              <span className="print-value">{report.material_code || '—'}</span>
            </td>
            <td>
              <span className="print-label">Batch / ISU No. &amp; Qty:</span>
              <span className="print-value">
                {report.batch_code_su_number || '—'}{report.qty !== null && report.qty !== undefined && report.qty !== '' ? ` (Qty: ${report.qty})` : ''}
              </span>
            </td>
          </tr>

          <tr>
            <td colSpan="3" className="print-section-title">
              TYPE OF DISCREPANCY
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={{ padding: '12px 15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {QDDR_DISCREPANCY_FLAGS.map((flag) => (
                  <div key={flag.key} className="checkbox-item" style={{ marginBottom: 0 }}>
                    <div className={`checkbox-box ${report[flag.key] ? 'checked' : ''}`}></div>
                    {flag.label}
                  </div>
                ))}
              </div>
              {report.others && (
                <div style={{ marginTop: '10px', fontSize: '12px' }}>
                  <strong>Others:</strong> {report.others}
                </div>
              )}
            </td>
          </tr>

          <tr>
            <td colSpan="3" className="print-section-title-dark">
              REASON OF DISCREPANCY
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={{ padding: '12px 15px' }}>
              <div className="details-text" style={{ minHeight: '60px' }}>
                {report.reason_of_discrepancy || 'No reason provided.'}
              </div>
              {Array.isArray(report.evidence_urls) && report.evidence_urls.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {report.evidence_urls.map((url, idx) => {
                    const lower = String(url || '').toLowerCase()
                    const isImg = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower) || lower.startsWith('data:image/')
                    return isImg ? (
                      <img
                        key={idx}
                        src={url}
                        alt={`Evidence ${idx + 1}`}
                        style={{ maxHeight: '110px', maxWidth: '160px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    ) : null
                  })}
                </div>
              )}
            </td>
          </tr>

          <tr>
            <td colSpan="3" className="print-section-title-dark">
              CORRECTIVE &amp; PREVENTIVE ACTIONS
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={{ padding: '12px 15px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span className="print-label">Corrective Action:</span>
                <div className="details-text" style={{ minHeight: '45px' }}>
                  {report.corrective_action || '—'}
                </div>
              </div>
              <div>
                <span className="print-label">Preventive Action:</span>
                <div className="details-text" style={{ minHeight: '45px' }}>
                  {report.preventive_action || '—'}
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style={{ padding: '10px', textAlign: 'center' }}>
              <div className="signature-box">
                <div style={{ fontSize: '15px', fontFamily: 'cursive', marginBottom: '8px' }}>
                  {reporterName}
                </div>
                <div className="signature-line"></div>
                <div className="signature-name">{reporterName}</div>
                <div className="signature-role">Reported By</div>
              </div>
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
              <div className="signature-box">
                <div style={{ fontSize: '15px', fontFamily: 'cursive', marginBottom: '8px' }}>
                  {leaderName}
                </div>
                <div className="signature-line"></div>
                <div className="signature-name">{leaderName}</div>
                <div className="signature-role">Leader / Supervisor</div>
              </div>
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
              <div className="signature-box">
                <div style={{ fontSize: '15px', fontFamily: 'cursive', marginBottom: '8px' }}>
                  {approvedByName}
                </div>
                <div className="signature-line"></div>
                <div className="signature-name">{approvedByName}</div>
                <div className="signature-role">Approved By (Noted: {notedByName})</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
})

QDDRPrintTemplate.displayName = 'QDDRPrintTemplate'

export default QDDRPrintTemplate
