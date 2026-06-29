import React from 'react'

export const ProgressRow = ({ label, tone, percent, icon }) => {
  const getTooltipText = () => {
    switch (String(label).toLowerCase()) {
      case 'compliant':
        return 'Compliant - Audited items that fully satisfy and follow all required ISO standard clause specifications.'
      case 'partial':
        return 'Partial - Audited items that partially meet clause requirements but need further adjustments or corrective actions.'
      case 'gap':
        return 'Gap - Identified areas that fail to meet standard requirements and lack documented procedures or compliance control.'
      default:
        return ''
    }
  }

  return (
    <div 
      className="progress-row iso-progress-row" 
      title={getTooltipText()}
      style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px', cursor: 'help' }}
    >
      <div className="progress-label-container iso-progress-label-container" style={{ width: '130px', flexShrink: 0 }}>
        <span className={`progress-icon progress-icon-${tone} iso-progress-icon`}>{icon}</span>
        <span className="progress-label-text iso-progress-label-text" style={{ color: '#0f172a' }}>{label}:</span>
      </div>
      <div className="progress-bar-container iso-progress-bar-container" style={{ flex: 1 }}>
        <div className={`progress-bar-fill progress-fill-${tone} iso-progress-bar-fill`} style={{ width: `${percent}%`, height: '100%' }} />
      </div>
      <span style={{ fontSize: '13px', color: '#475569', minWidth: '40px', textAlign: 'right' }}>{percent}%</span>
    </div>
  )
}
