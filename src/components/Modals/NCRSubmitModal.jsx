import React, { useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Upload as UploadIcon, X } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'

export default function NCRSubmitModal({ 
  isOpen, onClose, onSuccess,
  form, setField, handleFiles, removeFile, errors,
  isSubmitting, handleSubmit, departments,
  locations, productTypes, issueTypes, loadingDropdowns, evidenceError
}) {
  const { user } = useAuth()

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  return (
    <div 
      className="qflow-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(10, 17, 32, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      {/* 📦 STRUCTURED MODEL PROFILE CARD CONTAINER */}
      <div 
        className="qflow-ncr-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          background: '#111e38',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          boxSizing: 'border-box'
        }}
      >
        
        {/* ── HEADER LAYOUT (Fixed at top) ────────────────────────────────── */}
        <div 
          className="qflow-modal-header"
          style={{
            flexShrink: 0,
            padding: '22px 28px 14px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            boxSizing: 'border-box'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: 600, letterSpacing: '0.3px' }}>
            Submit Non-Conformance Report
          </h3>
          <button 
            onClick={onClose} 
            className="qflow-close-x-btn" 
            disabled={isSubmitting}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 📜 LAYER 1: SCROLLABLE INTERNAL FIELD LOGIC CANVAS 🚀 */}
        <div 
          className="qflow-modal-body-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxSizing: 'border-box'
          }}
        >
          
          {/* 📸 WIREFRAME POSITION 1: Evidence Image Uploader Box (Top Position) */}
          <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Evidence (Max 3 files):</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {form.previewUrls && form.previewUrls.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {form.previewUrls.map((preview, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {preview.type?.includes('image') ? (
                        <img src={preview.url} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', padding: '4px', textAlign: 'center' }}>
                          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📄</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{preview.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile && removeFile(idx) }}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(!form.files || form.files.length < 3) && (
                <div
                  className="qflow-upload-box-container"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    width: '100%', minHeight: '52px', background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    <UploadIcon size={18} className="icon-teal" />
                    <span>Upload File (Images, PDF, Doc)</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      if (handleFiles) {
                        handleFiles(Array.from(e.target.files))
                      }
                      e.target.value = null // reset so same file can be selected again
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
            {evidenceError && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '2px' }}>{evidenceError}</div>}
          </div>

          {/* 📐 WIREFRAME POSITION 2: 3-Column Balanced Component Matrix Layout Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', width: '100%' }}>
            
            {/* Product Type select field */}
            <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Product Type:</label>
              <select 
                value={form.productTypeId || ''} 
                onChange={(e) => {
                  const id = e.target.value
                  const pt = productTypes.find((p) => String(p.id) === String(id))
                  setField('productTypeId', id)
                  setField('productType', pt ? pt.name : '')
                }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">Select product type</option>
                {productTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>

            {/* Batch Number manual input */}
            <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Batch Number:</label>
              <input 
                value={form.batchNumber} 
                onChange={(e) => setField('batchNumber', e.target.value)} 
                placeholder="e.g. BATCH-2026-001"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Location select field */}
            <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Location:</label>
              <select 
                value={form.locationId || ''} 
                onChange={(e) => {
                  const id = e.target.value
                  const loc = locations.find((l) => String(l.id) === String(id))
                  setField('locationId', id)
                  setField('location', loc ? loc.location_name : '')
                }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.location_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 📐 WIREFRAME POSITION 3: 2-Column Selection Grid Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
            
            {/* Severity input group */}
            <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Severity Level:</label>
              <select value={form.severity} onChange={(e) => setField('severity', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">Select severity...</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              {errors.severity && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '2px' }}>{errors.severity}</div>}
            </div>

            {/* Department input group */}
            <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Department:</label>
              <select value={form.departmentId} onChange={(e) => setField('departmentId', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">Select department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                ))}
              </select>
              {errors.departmentId && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '2px' }}>{errors.departmentId}</div>}
            </div>
          </div>

          {/* 📐 WIREFRAME POSITION 3B: Full-Width Issue Category */}
          <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <SearchableDropdown
              label="Issue Category:"
              value={form.issueType}
              onValueChange={(val) => setField('issueType', val)}
              options={issueTypes}
              loading={loadingDropdowns}
              placeholder="Search issue category..."
              onSelectOption={(opt) => {
                setField('issueType', opt.label)
                setField('issueTypeId', String(opt.id))
              }}
            />
            {errors.issueType && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '2px' }}>{errors.issueType}</div>}
          </div>

          {/* 📝 WIREFRAME POSITION 4: Wide Description Textarea Input block */}
          <div className="qflow-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>Description:</label>
            <textarea 
              value={form.description} 
              onChange={(e) => setField('description', e.target.value)} 
              placeholder="Describe the non-conformance details..."
              style={{ width: '100%', height: '90px', minHeight: '70px', maxHeight: '150px', boxSizing: 'border-box', resize: 'vertical' }}
            />
            {errors.description && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '2px' }}>{errors.description}</div>}
          </div>

        </div>

        {/* ⚓ LAYER 2: STATIC CONTROL FOOTER ACTIONS (Fixed at the base) ───────── */}
        <div 
          className="qflow-modal-footer"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 28px',
            background: '#0d172a',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            boxSizing: 'border-box'
          }}
        >
          <button 
            type="button" 
            className="qflow-btn-cancel" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="qflow-btn-submit"
            disabled={isSubmitting}
            onClick={async () => {
              const res = await handleSubmit(user?.id)
              if (res && res.success) {
                onClose()
              }
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>

      </div>
    </div>
  )
}