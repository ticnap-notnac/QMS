import React, { useRef } from 'react'
import useNCRSubmitModal from '../../hooks/useNCRSubmitModal'
import { useAuth } from '../../hooks/useAuth'
import { Upload as UploadIcon } from 'lucide-react'

export default function NCRSubmitModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const {
    form,
    setField,
    handleFile,
    errors,
    isSubmitting,
    handleSubmit,
    departments,
    locations,
    productTypes,
    loadingDropdowns,
    evidenceError,
  } = useNCRSubmitModal({ onSuccess })

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Submit Non-Conformance Report</h3>
        <div className="modal-body">
          <div
            className="upload-box"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            {!form.previewUrl ? (
              <>
                <UploadIcon size={20} className="icon-teal" />
                <span className="reports-upload-text">Upload an Image</span>
              </>
            ) : (
              <div className="upload-preview" style={{ position: 'relative' }}>
                <img src={form.previewUrl} alt="Evidence preview" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} />
                <button
                  type="button"
                  className="remove-preview-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFile(null)
                  }}
                  style={{ position: 'absolute', top: 8, right: 8 }}
                >
                  ✕
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>
          {evidenceError && <div className="error">{evidenceError}</div>}
          {/** continue with other fields */}
          <label>Department</label>
          <select value={form.departmentId} onChange={(e) => setField('departmentId', e.target.value)}>
            <option value="">Select department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.department_name}</option>
            ))}
          </select>
          {errors.departmentId && <div className="error">{errors.departmentId}</div>}

          <label>Batch Number</label>
          <input value={form.batchNumber} onChange={(e) => setField('batchNumber', e.target.value)} />

          <label>Product Type</label>
          <select value={form.productTypeId || ''} onChange={(e) => {
            const id = e.target.value
            const pt = productTypes.find((p) => String(p.id) === String(id))
            setField('productTypeId', id)
            setField('productType', pt ? pt.name : '')
          }}>
            <option value="">Select product type</option>
            {productTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </select>

          <label>Location</label>
          <select value={form.locationId || ''} onChange={(e) => {
            const id = e.target.value
            const loc = locations.find((l) => String(l.id) === String(id))
            setField('locationId', id)
            setField('location', loc ? loc.location_name : '')
          }}>
            <option value="">Select location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.location_name}</option>
            ))}
          </select>

          <label>Severity</label>
          <select value={form.severity} onChange={(e) => setField('severity', e.target.value)}>
            <option value="">Select severity</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          {errors.severity && <div className="error">{errors.severity}</div>}

          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} />
          {errors.description && <div className="error">{errors.description}</div>}

          {/* Evidence handled in upload box above; no duplicate input here */}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button onClick={async () => {
            const res = await handleSubmit(user?.id)
            if (res && res.success) {
              onClose()
            } else {
              // swallow - errors are shown via state
            }
          }} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
