/**
 * components/Modals/FilterModal.jsx
 *
 * Controlled filter panel for narrowing down NCR report dashboard entries.
 */

import React from 'react'
import { X, Filter } from 'lucide-react'

export default function FilterModal({
  isOpen,
  onClose,
  filters = {}, 
  setFilters,
  departments = [],
  onClear,
  onApply,
  userRole
}) {
  if (!isOpen) return null

  // Helper toggle functions for multi-select button arrays
  const handleStatusToggle = (status) => {
    if (!setFilters) return
    setFilters(prev => ({ 
      ...prev, 
      status: (prev && prev.status === status) ? '' : status 
    }))
  }

  const handleSeverityToggle = (sev) => {
    if (!setFilters) return
    setFilters(prev => ({ 
      ...prev, 
      severity: (prev && prev.severity === sev) ? '' : sev 
    }))
  }

  // Safe fallback reading for filtering states
  const currentDepartmentId = filters?.departmentId || ''
  const currentDate = filters?.date || ''
  const currentStatus = filters?.status || ''
  const currentSeverity = filters?.severity || ''

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
    >
      {/* 📦 FILTER MODAL CONTAINER CARD */}
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box'
        }}
      >
        
        {/* ── HEADER LAYER ── */}
        <div 
          style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <Filter size={18} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 600 }}>
              Filter Reports
            </h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 📜 MODAL CONTENT INTERNAL FORM DATA CANVAS ── */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', flex: 1 }}>
          
          {/* Informational Subtext */}
          <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
            Filtering narrows down records by choosing target options for department, current status, metric severity, and occurrence date.
          </p>

          {/* 📐 ROW 1: Department & Date Input Fields Side-by-Side */}
          {(() => {
            const isSuperUser = ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase())
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isSuperUser ? '1fr 1fr' : '1fr', gap: '16px' }}>
                {isSuperUser && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="label-field" style={{ margin: 0 }}>Department</label>
                    <select
                      value={currentDepartmentId}
                      onChange={(e) => setFilters && setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
                      className="input-field"
                      style={{ width: '100%', height: '38px' }}
                    >
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={String(d.id)}>{d.department_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="label-field" style={{ margin: 0 }}>Date</label>
                  <input
                    type="date"
                    value={currentDate}
                    onChange={(e) => setFilters && setFilters(prev => ({ ...prev, date: e.target.value }))}
                    max="9999-12-31"
                    className="input-field"
                    style={{ width: '100%', height: '38px', padding: '0 12px' }}
                  />
                </div>
              </div>
            )
          })()}

          {/* 📐 ROW 2: Status Selection Array */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="label-field" style={{ margin: 0 }}>Status</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['OPEN', 'CLOSED'].map((st) => {
                const isActive = currentStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusToggle(st)}
                    className="btn-quick-toggle"
                    style={{
                      height: '36px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: isActive ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      background: isActive ? '#0f172a' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      transition: 'all 0.2s ease',
                      flex: 1
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 📐 ROW 3: Severity Level Grid Array Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="label-field" style={{ margin: 0 }}>Severity Level</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {['Low', 'Medium', 'High'].map((sev) => {
                const isActive = currentSeverity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => handleSeverityToggle(sev)}
                    className="btn-quick-toggle"
                    style={{
                      height: '36px',
                      padding: '0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: isActive ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      background: isActive ? '#0f172a' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#475569',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        <div 
  style={{
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    boxSizing: 'border-box',
    width: '100%'
  }}
>
          <button 
            type="button" 
            className="btn-secondary-light" 
            onClick={onClear} 
            style={{ margin: 0, padding: '8px 20px', fontSize: '13px', height: '36px', display: 'flex', alignItems: 'center' }}
          >
            Clear Filters
          </button>
          <button 
            type="button" 
            className="btn-gradient-primary" 
            onClick={() => onApply && onApply(filters)}
            style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: '36px', display: 'flex', alignItems: 'center', boxShadow: 'none' }}
          >
            Filter Report
          </button>
        </div>

      </div>
    </div>
  )
}