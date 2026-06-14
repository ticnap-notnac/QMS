import React from 'react'

export const ProgressRow = ({ label, tone, percent, icon }) => (
  <div className="progress-row iso-progress-row" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
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
