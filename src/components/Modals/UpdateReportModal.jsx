import { useRef } from 'react'
import { Calendar, FileSearch, Upload as UploadIcon } from 'lucide-react'
import SearchableDropdown from '@/components/Forms/SearchableDropdown'
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

export default function UpdateReportModal({ 
  isOpen, 
  onClose, 
  report,
  form,
  previewUrl,
  deptName,
  setField,
  handleFile,
  errors,
  error,
  isSubmitting,
  handleSubmit,
  issueTypeOptions,
  issueTypesLoading,
  suggestion,
  isSuggesting,
  suggestionError,
  loadSuggestion
}) {
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card--tall reports-update-card">
        <button type="button" onClick={onClose} className="modal-close-button" style={{ zIndex: 10 }}>×</button>
        
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSearch size={18} className="icon-teal" />
            <h3 className="reports-update-title">Update Report</h3>
          </div>
        </div>

        <form
          className="modal-form-content reports-form-compact"
          onSubmit={async (event) => {
            event.preventDefault()
            const prevAction = suggestion?.preventiveAction || ''
            const result = await handleSubmit(event, prevAction)
            if (result?.success) {
              onClose()
            }
          }}
        >
          {error ? <div className="user-info-error" style={{ marginBottom: '16px' }}>{error}</div> : null}
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

          {/* Issue Category — editable so old null-type reports can be fixed */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <SearchableDropdown
              label="Issue Category:"
              value={form.issueType || ''}
              onValueChange={(val) => setField('issueType', val)}
              options={issueTypeOptions}
              loading={issueTypesLoading}
              placeholder="Search category…"
              onSelectOption={(opt) => { setField('issueType', opt.label) }}
            />
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
            <label className="label-field">Corrective Action</label>
            <textarea
              value={form.correctiveAction || ''}
              onChange={(event) => setField('correctiveAction', event.target.value)}
              className="input-field textarea-medium"
              placeholder="Describe the immediate corrective action taken..."
            />
          </div>

          {/* AI Suggestions Panel */}
          <div style={{ marginTop: '16px', background: 'rgba(15, 23, 42, 0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <span className="label-field" style={{ margin: 0, fontWeight: 'bold', color: '#22d3ee' }}>AI / CBR Action Suggestions</span>

              {suggestion && !isSuggesting && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                  background: 'rgba(34,197,94,0.15)', color: '#86efac',
                  border: '1px solid rgba(34,197,94,0.25)'
                }}>
                  {Math.round((suggestion.confidence || 0) * 100)}% match
                </span>
              )}

              {suggestion?.cached && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                  background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.25)'
                }}>
                  cached
                </span>
              )}

              {suggestion?.fromRepository && !suggestion?.cached && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                  background: 'rgba(34,197,94,0.15)', color: '#86efac',
                  border: '1px solid rgba(34,197,94,0.25)'
                }}>
                  CBR match
                </span>
              )}

              {suggestion?.matchedFeatures?.length > 0 && !suggestion?.cached && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                  background: 'rgba(99,102,241,0.12)', color: '#c4b5fd',
                  border: '1px solid rgba(99,102,241,0.25)'
                }}>
                  ✓ {suggestion.matchedFeatures.join(' · ')}
                </span>
              )}

              {!suggestion?.fromRepository && !suggestion?.cached && suggestion && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                  background: 'rgba(245,158,11,0.15)', color: '#fde68a',
                  border: '1px solid rgba(245,158,11,0.25)'
                }}>
                  AI generated
                </span>
              )}
            </div>

            {isSuggesting && (
              <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '8px 0' }}>
                Analyzing similar cases...
              </div>
            )}

            {suggestionError && (
              <div style={{ color: '#fca5a5', fontSize: '13px', padding: '8px 0' }}>
                {suggestionError}
              </div>
            )}

            {suggestion && !isSuggesting && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
                {/* Corrective Action Section */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Suggested Corrective Action</div>
                  <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.4' }}>{suggestion.text}</div>
                  <button
                    type="button"
                    className="btn-gradient-primary"
                    onClick={() => setField('correctiveAction', suggestion.text)}
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', marginTop: '6px', boxShadow: 'none' }}
                  >
                    Accept Corrective Action
                  </button>
                </div>

                {/* Preventive Action Section */}
                {suggestion.preventiveAction && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Suggested Preventive Action</div>
                    <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.4' }}>{suggestion.preventiveAction}</div>
                    <button
                      type="button"
                      className="btn-gradient-primary"
                      onClick={() => setField('resolutionDetails', suggestion.preventiveAction)}
                      style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', marginTop: '6px', boxShadow: 'none', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                    >
                      Accept Preventive Action
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn-quick-toggle"
                onClick={loadSuggestion}
                disabled={isSuggesting}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                {isSuggesting ? 'Analyzing...' : 'Regenerate Suggestions'}
              </button>
              {suggestion && !isSuggesting && suggestion.preventiveAction && (
                <button
                  type="button"
                  className="btn-secondary-light"
                  onClick={() => {
                    setField('correctiveAction', suggestion.text)
                    setField('resolutionDetails', suggestion.preventiveAction)
                  }}
                  style={{ fontSize: '12px', padding: '6px 14px', height: 'auto' }}
                >
                  Accept Both
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="label-field">Resolution Details (Preventive Action)</label>
            <textarea
              value={form.resolutionDetails}
              onChange={(event) => setField('resolutionDetails', event.target.value)}
              className="input-field textarea-medium"
              placeholder="Describe the resolution or preventive action..."
            />
            {errors.resolutionDetails ? <div className="user-info-error">{errors.resolutionDetails}</div> : null}
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

          <div className="modal-footer-actions">
            <button type="submit" className="btn-gradient-primary reports-update-button" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
