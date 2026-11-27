import React from 'react'
import Tooltip from '../UI/Tooltip.jsx'

export const ProgressRow = ({ label, tone, percent, icon }) => {
  const getTooltipText = () => {
    switch (String(label).toLowerCase()) {
      case 'compliant':
        return 'Audited items that fully satisfy and follow all required ISO standard clause specifications.'
      case 'ofi':
      case 'opportunity for improvement':
      case 'opportunity for improvement (ofi)':
        return 'Observations or areas where efficiency can be improved to prevent future non-conformance. No mandatory corrective action required.'
      case 'minor non-conformance':
      case 'minor nc':
      case 'partial':
        return 'An isolated lapse in meeting ISO requirements that does not directly compromise the entire quality management system.'
      case 'major non-conformance':
      case 'major nc':
      case 'gap':
        return 'A critical breakdown, total absence of a required procedure, or direct compliance risk requiring an immediate CAR.'
      default:
        return ''
    }
  }

  const tooltipText = getTooltipText()

  const rowContent = (
    <div 
      className="progress-row iso-progress-row" 
      style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px', cursor: 'help' }}
    >
      <div className="progress-label-container iso-progress-label-container" style={{ width: '130px', flexShrink: 0 }}>
        <span className={`progress-icon progress-icon-${tone} iso-progress-icon`}>{icon}</span>
        <span className="progress-label-text iso-progress-label-text" style={{ color: '#1A435A' }}>{label}:</span>
      </div>
      <div className="progress-bar-container iso-progress-bar-container" style={{ flex: 1 }}>
        <div className={`progress-bar-fill progress-fill-${tone} iso-progress-bar-fill`} style={{ width: `${percent}%`, height: '100%' }} />
      </div>
      <span style={{ fontSize: '13px', color: '#475569', minWidth: '40px', textAlign: 'right' }}>{percent}%</span>
    </div>
  )

  if (tooltipText) {
    return (
      <Tooltip content={tooltipText} position="top" className="full-width">
        {rowContent}
      </Tooltip>
    )
  }

  return rowContent
}
