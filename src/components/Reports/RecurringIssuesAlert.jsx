import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default function RecurringIssuesAlert({ clusters, onGenerateCar, onViewReports, isViewingReports }) {
  if (!clusters || clusters.length === 0) return null

  const totalClusters = clusters.length
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      padding: '12px 20px',
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          backgroundColor: '#fee2e2',
          color: '#ef4444',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          Clause Trend
        </span>
        <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '15px' }}>
          Recurring Unlinked Issues Detected ({totalClusters} trend{totalClusters > 1 ? 's' : ''})
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onViewReports && onViewReports(isViewingReports ? null : clusters[0])}
          style={{
            backgroundColor: '#ffffff',
            color: '#dc2626',
            border: '1px solid #dc2626',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.target.style.backgroundColor = '#fee2e2' }}
          onMouseOut={(e) => { e.target.style.backgroundColor = '#ffffff' }}
        >
          {isViewingReports ? 'Clear Filter' : 'View Reports'}
        </button>
        <button
          onClick={() => onGenerateCar(clusters[0])}
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
        >
          Generate CAR
        </button>
      </div>
    </div>
  )
}
