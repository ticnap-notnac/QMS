import { useRef } from 'react'
import { Calendar, FileSearch, Upload as UploadIcon } from 'lucide-react'
import useUpdateReportModal from '@/hooks/useUpdateReportModal'

function FieldCard({ label, value }) {
  return (
    <div>
      <label className="label-field">{label}</label>
      <div className="reports-readonly-field">{value || 'Not available'}</div>
    </div>
  )
}

function formatResolutionTime(value) {
  if (!value) return 'Not available'
  return String(value)
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB')
}

export default function UpdateReportModal({ isOpen, onClose, report, onSuccess }) {
  const fileInputRef = useRef(null)
  const {
    form,
    previewUrl,
    setField,
    handleFile,
    errors,
    error,
    isSubmitting,
    handleSubmit,
  } = useUpdateReportModal({ report, onSuccess })

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card--tall reports-update-card">
        <button type="button" onClick={onClose} className="modal-close-button">×</button>
        <div className="modal-header-row">
          <FileSearch size={18} className="icon-teal" />
          <h3 className="reports-update-title">Update Report</h3>
        </div>

        {error ? <div className="user-info-error">{error}</div> : null}

        <form
          className="modal-form reports-form-compact"
          onSubmit={async (event) => {
            const result = await handleSubmit(event)
            if (result?.success) {
              onClose()
            }
          }}
        >
          <div className="modal-grid-2">
            <FieldCard label="Product Type" value={report?.product_type_name || report?.product_type} />
            <FieldCard label="Batch Number" value={report?.batch_number} />
          </div>

          <div className="modal-grid-2">
            <FieldCard label="Location" value={report?.location_name || report?.complaint_location} />
            <FieldCard label="Severity Level" value={(report?.severity || 'low').toString().toUpperCase()} />
          </div>

          <div className="modal-grid-2">
            <FieldCard label="Department" value={report?.reporter_department_name || report?.department_name || report?.department_id} />
            <FieldCard label="Description" value={report?.description} />
          </div>

          <div>
            <label className="label-field">Evidence</label>
            {report?.evidence_url ? (
              <img src={report.evidence_url} alt="Evidence" className="update-modal-image" />
            ) : (
              <div className="reports-readonly-field">No evidence image attached</div>
            )}
          </div>

          <div>
            <label className="label-field">Investigation Details</label>
            <textarea
              value={form.investigationDetails}
              onChange={(event) => setField('investigationDetails', event.target.value)}
              className="input-field textarea-medium"
              placeholder="Describe the investigation findings..."
            />
            {errors.investigationDetails ? <div className="user-info-error">{errors.investigationDetails}</div> : null}
          </div>

          <div>
            <label className="label-field">Resolution Details</label>
            <textarea
              value={form.resolutionDetails}
              onChange={(event) => setField('resolutionDetails', event.target.value)}
              className="input-field textarea-medium"
              placeholder="Describe the resolution or corrective action..."
            />
            {errors.resolutionDetails ? <div className="user-info-error">{errors.resolutionDetails}</div> : null}
          </div>

          <div className="modal-grid-2">
            <div>
              <label className="label-field">Resolution Time</label>
              <div className="resolution-time-row">
                <input
                  type="number"
                  min="1"
                  value={form.resolutionTimeValue}
                  onChange={(event) => setField('resolutionTimeValue', event.target.value)}
                  className="input-field"
                  placeholder="24"
                />
                <select
                  value={form.resolutionTimeUnit}
                  onChange={(event) => setField('resolutionTimeUnit', event.target.value)}
                  className="select-field"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              {errors.resolutionTime ? <div className="user-info-error">{errors.resolutionTime}</div> : null}
            </div>
            <div>
              <label className="label-field">Verification Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={form.verificationDate}
                  onChange={(event) => setField('verificationDate', event.target.value)}
                  className="input-field"
                />
                <Calendar size={14} className="icon-abs" />
              </div>
              {errors.verificationDate ? <div className="user-info-error">{errors.verificationDate}</div> : null}
            </div>
          </div>

          <div>
            <label className="label-field">Investigation Evidence</label>
            <div
              className="upload-box upload-box--padded"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              {!previewUrl ? (
                <>
                  <UploadIcon size={18} className="icon-teal" />
                  <span className="reports-upload-text-small">Upload investigation evidence</span>
                </>
              ) : (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img src={previewUrl} alt="Investigation evidence preview" className="update-modal-image" />
                  <button
                    type="button"
                    className="remove-preview-btn"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleFile(null)
                    }}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    ×
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(event) => handleFile(event.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="reports-update-submit-row">
            <button type="submit" className="btn-gradient-primary reports-update-button" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
