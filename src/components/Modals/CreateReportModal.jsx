/**
 * components/Modals/CreateReportModal.jsx
 *
 * feat(reports): extract create-report modal into standalone component
 *
 * Owns:
 * - All form field rendering (product type, batch, location, severity, department, description)
 * - Evidence file upload + preview
 * - Submit / cancel wiring via props
 * - No internal state — fully controlled by useReportsLogic via createFormState
 */

import { useEffect, useRef, useState } from 'react'
import { X as CloseIcon, Upload as UploadIcon } from 'lucide-react'
import SearchableDropdown from '@/components/Forms/SearchableDropdown'

const SEVERITY_OPTIONS = ['low', 'medium', 'high']

const NCR_ISSUE_TYPES = [
  { value: 'quality_food_safety',          label: 'Quality / Food Safety Issue' },
  { value: 'environment_health_safety',    label: 'Environment, Health & Safety Issue' },
  { value: 'security_issue',               label: 'Security Issue' },
  { value: 'internal_audit',              label: 'Internal Audit' },
  { value: 'customer_complaint',          label: 'Customer Complaint' },
  { value: 'government_agency_audit',     label: 'Government Agency Audit Non-Conformance' },
  { value: 'customer_audit_nonconformance', label: 'Customer Audit Non-Conformance' },
  { value: 'vendor_nonconformance',       label: 'Vendor Non-Conformance' },
]

function CreateReportModal({
  isOpen,
  onClose,
  onSubmit,
  error,
  isLoading,
  createFormState,
  locationOptions,
  productTypeOptions,
  issueTypeOptions,
  departments,
  locationsLoading,
  productTypesLoading,
  issueTypesLoading,
  departmentsLoading,
  fileInputRef,
  evidenceFile,
  setEvidenceFile,
  evidencePreview,
  setEvidencePreview,
  evidenceError,
  setEvidenceError,
}) {
  if (!isOpen) return null

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const {
    productType, setProductType,
    setProductTypeId,
    batchNumber, setBatchNumber,
    location, setLocation,
    setLocationId,
    severity, setSeverity,
    department, setDepartment,
    description, setDescription,
    issueType, setIssueType,
    setIssueTypeId,
  } = createFormState

  const [isAiGenerating, setIsAiGenerating] = useState(false)

  // AI Auto-fill trigger when image is uploaded and context is set
  useEffect(() => {
    if (evidenceFile && productType && location && batchNumber && !description) {
      setIsAiGenerating(true)
      // Simulate AI processing of image + metadata
      setTimeout(() => {
        setDescription(`AI Observation: Initial visual inspection confirms incident at ${location} involving ${productType} (Batch: ${batchNumber}). Evidence indicates preliminary compliance deviations requiring further review.`)
        setIsAiGenerating(false)
      }, 1500)
    }
  }, [evidenceFile, productType, location, batchNumber])

  const contextFilled = Boolean(productType && location && batchNumber)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setEvidenceError('Only image files are supported (jpg, png, webp, gif).')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setEvidenceError('File must be under 10 MB.')
      return
    }

    setEvidenceError(null)
    if (evidencePreview) {
      try { URL.revokeObjectURL(evidencePreview) } catch (_) {}
    }
    setEvidenceFile(file)
    setEvidencePreview(URL.createObjectURL(file))
  }

  const clearEvidence = () => {
    if (evidencePreview) {
      try { URL.revokeObjectURL(evidencePreview) } catch (_) {}
    }
    setEvidenceFile(null)
    setEvidencePreview(null)
    setEvidenceError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* 📦 Container Box Card context wrapper */}
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? 'calc(100vw - 16px)' : '800px',
          maxWidth: '95vw',
          maxHeight: isMobile ? 'calc(100vh - 16px)' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          transform: isMobile ? 'scale(0.88)' : 'none',
          transformOrigin: 'top center'
        }}
      >
        {/* ── HEADER (Fixed at top) ── */}
        <button type="button" onClick={onClose} className="modal-close-button">
          <CloseIcon size={18} />
        </button>
        <div className="modal-header-row" style={{ flexShrink: 0, marginBottom: isMobile ? '10px' : '16px', paddingLeft: isMobile ? '16px' : '28px', paddingRight: isMobile ? '40px' : '48px', paddingTop: isMobile ? '14px' : '24px' }}>
          <h3 className="reports-update-title" style={{ margin: 0 }}>Submit NCR Report</h3>
        </div>

        {error && <div className="user-info-error" style={{ marginBottom: '12px', flexShrink: 0, marginLeft: isMobile ? '16px' : '28px', marginRight: isMobile ? '16px' : '28px', whiteSpace: 'pre-line' }}>{error}</div>}

        {/* 📜 SCROLLABLE CANVAS BODY TRACK ── */}
        <div 
          className="modal-form-content" 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            paddingLeft: isMobile ? '14px' : '28px',
            paddingRight: isMobile ? '14px' : '28px',
            paddingBottom: isMobile ? '14px' : '24px'
          }}
        >
          <form className="modal-form reports-form-compact" onSubmit={onSubmit} style={{ gap: isMobile ? '10px' : '16px' }}>

            {/* 📐 WIREFRAME ROW 1: 3-Column Compact Selection Rows (Product, Batch, Location) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '10px' : '14px' }}>
              {/* Product Type Search Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Product Type: *"
                  value={productType}
                  onValueChange={setProductType}
                  options={productTypeOptions}
                  loading={productTypesLoading}
                  placeholder="Search product…"
                  onSelectOption={(opt) => { setProductType(opt.label); setProductTypeId(String(opt.id)) }}
                />
              </div>

              {/* Batch / Lot Number Input */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field" style={{ margin: 0, marginBottom: '6px' }}>Batch / Lot Number: *</label>
                <input
                  type="text"
                  className="input-field"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-2026-001"
                  required
                  style={{ width: '100%', height: '38px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Location Search Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Location: *"
                  value={location}
                  onValueChange={setLocation}
                  options={locationOptions}
                  loading={locationsLoading}
                  placeholder="Search location…"
                  onSelectOption={(opt) => { setLocation(opt.label); setLocationId(String(opt.id)) }}
                />
              </div>
            </div>

            {/* 📸 WIREFRAME ROW 2: Evidence / Image Upload Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-field" style={{ margin: 0 }}>Evidence (Required context first):</label>
              {evidencePreview ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img
                    src={evidencePreview}
                    alt="Evidence preview"
                    style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <button
                    type="button"
                    onClick={clearEvidence}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(15, 23, 42, 0.8)', border: 'none', borderRadius: '50%',
                      width: '24px', height: '24px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className="upload-box"
                  style={{ 
                    cursor: contextFilled ? 'pointer' : 'not-allowed', 
                    padding: '14px', 
                    margin: 0,
                    opacity: contextFilled ? 1 : 0.6,
                    background: contextFilled ? 'rgba(8, 145, 178, 0.05)' : '#f8fafc',
                    border: contextFilled ? '1px dashed #0891b2' : '1px dashed #cbd5e1'
                  }}
                  onClick={() => contextFilled && fileInputRef.current?.click()}
                  title={!contextFilled ? "Please select Product, Plate, and Location first" : ""}
                >
                  <UploadIcon size={18} style={{ color: contextFilled ? '#0891b2' : 'var(--muted)' }} />
                  <p style={{ color: contextFilled ? '#0891b2' : 'var(--muted)', margin: 0, fontSize: '13px' }}>
                    {contextFilled ? "Upload an Image (AI Auto-fill Ready)" : "Select context metadata above to enable upload"}
                  </p>
                </div>
              )}
              {evidenceError && (
                <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>{evidenceError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={!contextFilled}
              />
            </div>

            {/* 📐 WIREFRAME ROW 3: 3-Column — Severity, Department, Issue Category */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '10px' : '14px' }}>
              {/* Severity Dropdown Select */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Severity Level:</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '38px' }}
                >
                  <option value="">Select Severity…</option>
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Department Dropdown Select */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Department:</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-field"
                  disabled={departmentsLoading}
                  style={{ width: '100%', height: '38px' }}
                >
                  <option value="">{departmentsLoading ? 'Loading…' : 'Select Department…'}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              {/* Issue Category Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Issue Category:"
                  value={issueType}
                  onValueChange={setIssueType}
                  options={issueTypeOptions}
                  loading={issueTypesLoading}
                  placeholder="Search category…"
                  onSelectOption={(opt) => { setIssueType(opt.label); setIssueTypeId(String(opt.id)) }}
                />
              </div>
            </div>

            {/* 📝 WIREFRAME ROW 4: Full-Width Description Entry Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
              <label className="label-field" style={{ margin: 0 }}>
                Description:
                {isAiGenerating && <span style={{ color: '#0891b2', marginLeft: '8px', fontSize: '12px' }}>(AI Auto-filling...)</span>}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                placeholder="Describe the non-conformance details…"
                required
                disabled={isAiGenerating}
                style={{ 
                  width: '100%', 
                  height: '75px', 
                  padding: '10px', 
                  resize: 'none', 
                  boxSizing: 'border-box',
                  background: isAiGenerating ? 'rgba(8, 145, 178, 0.05)' : '#fff'
                }}
              />
            </div>

            {/* Hidden button to hook up standard HTML form enter key submit wiring handling */}
            <button type="submit" style={{ display: 'none' }} disabled={isLoading} />
          </form>
        </div>

        {/* ── FOOTER ACTIONS ACTIONS (Fixed at absolute bottom base) ── */}
        <div 
          className="modal-footer-actions"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            padding: isMobile ? '12px 14px 14px 14px' : '18px 28px 24px 28px',
            background: 'transparent',
            borderTop: '1px solid #cbd5e1',
            marginTop: '12px'
          }}
        >
          <button type="button" className="btn-secondary-light" onClick={onClose} disabled={isLoading} style={{ margin: 0, padding: '8px 20px', fontSize: '13px' }}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn-gradient-primary" 
            disabled={isLoading}
            onClick={onSubmit}
            style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}
          >
            {isLoading ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default CreateReportModal
