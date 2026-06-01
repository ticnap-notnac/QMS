/**
 * components/Modals/CreateReportModal.jsx
 *
 * feat(reports): extract create-report modal into standalone component
 *
 * Owns:
 *   - All form field rendering (product type, batch, location, severity, department, description)
 *   - Evidence file upload + preview
 *   - Submit / cancel wiring via props
 *   - No internal state — fully controlled by useReportsLogic via createFormState
 */

import { useRef } from 'react'
import { X as CloseIcon, Upload as UploadIcon } from 'lucide-react'
import SearchableDropdown from '@/components/SearchableDropdown'

const SEVERITY_OPTIONS = ['low', 'medium', 'high']

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSubmit: (e: Event) => void,
 *   error: string | null,
 *   isLoading: boolean,
 *
 *   // form fields
 *   createFormState: {
 *     productType: string, setProductType: fn,
 *     productTypeId: string, setProductTypeId: fn,
 *     batchNumber: string, setBatchNumber: fn,
 *     location: string, setLocation: fn,
 *     locationId: string, setLocationId: fn,
 *     severity: string, setSeverity: fn,
 *     department: string, setDepartment: fn,
 *     description: string, setDescription: fn,
 *   },
 *
 *   // lookup options
 *   locationOptions: Array<{ id, label }>,
 *   productTypeOptions: Array<{ id, label }>,
 *   departments: Array<{ id, department_name }>,
 *   locationsLoading: boolean,
 *   productTypesLoading: boolean,
 *   departmentsLoading: boolean,
 *
 *   // evidence
 *   fileInputRef: React.RefObject,
 *   evidenceFile: File | null,
 *   setEvidenceFile: fn,
 *   evidencePreview: string | null,
 *   setEvidencePreview: fn,
 *   evidenceError: string | null,
 *   setEvidenceError: fn,
 * }} props
 */
function CreateReportModal({
  isOpen,
  onClose,
  onSubmit,
  error,
  isLoading,
  createFormState,
  locationOptions,
  productTypeOptions,
  departments,
  locationsLoading,
  productTypesLoading,
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

  const {
    productType, setProductType,
    setProductTypeId,
    batchNumber, setBatchNumber,
    location, setLocation,
    setLocationId,
    severity, setSeverity,
    department, setDepartment,
    description, setDescription,
  } = createFormState

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
    <div className="modal-overlay">
      <div className="modal-card modal-card--tall">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <button type="button" onClick={onClose} className="modal-close-button">
          <CloseIcon size={18} />
        </button>
        <div className="modal-header-row">
          <h3 className="reports-update-title">Submit NCR Report</h3>
        </div>

        {error && <div className="user-info-error" style={{ marginBottom: '12px' }}>{error}</div>}

        {/* ── Form ───────────────────────────────────────────────────── */}
        <form className="modal-form reports-form-compact" onSubmit={onSubmit}>

          {/* Product Type */}
          <SearchableDropdown
            label="Product Type"
            value={productType}
            onValueChange={setProductType}
            options={productTypeOptions}
            loading={productTypesLoading}
            placeholder="Search or enter product type…"
            onSelectOption={(opt) => { setProductType(opt.label); setProductTypeId(String(opt.id)) }}
          />

          {/* Batch Number */}
          <div>
            <label className="label-field">Batch Number</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="input-field"
              placeholder="e.g. BATCH-2024-001"
            />
          </div>

          {/* Location */}
          <SearchableDropdown
            label="Location"
            value={location}
            onValueChange={setLocation}
            options={locationOptions}
            loading={locationsLoading}
            placeholder="Search or enter location…"
            onSelectOption={(opt) => { setLocation(opt.label); setLocationId(String(opt.id)) }}
          />

          {/* Severity */}
          <div>
            <label className="label-field">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="input-field"
            >
              <option value="">Select severity…</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="label-field">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input-field"
              disabled={departmentsLoading}
            >
              <option value="">{departmentsLoading ? 'Loading…' : 'Select department…'}</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.department_name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label-field">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field textarea-medium"
              placeholder="Describe the non-conformance…"
              required
            />
          </div>

          {/* Evidence upload */}
          <div>
            <label className="label-field">Evidence (optional)</label>
            {evidencePreview ? (
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <img
                  src={evidencePreview}
                  alt="Evidence preview"
                  style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '10px' }}
                />
                <button
                  type="button"
                  onClick={clearEvidence}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : (
              <div
                className="evidence-box"
                style={{ cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon size={22} style={{ color: 'var(--muted)', marginBottom: '6px' }} />
                <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '13px' }}>
                  Click to upload image evidence
                </p>
              </div>
            )}
            {evidenceError && (
              <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '6px' }}>{evidenceError}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Actions */}
          <div className="reports-update-submit-row">
            <button type="button" className="btn-edit-user" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-gradient-primary reports-update-button" disabled={isLoading}>
              {isLoading ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateReportModal