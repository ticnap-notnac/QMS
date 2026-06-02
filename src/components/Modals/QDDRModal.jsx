import { useState } from 'react'
import { X as CloseIcon } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'

function QDDRModal({
  isOpen,
  onClose,
  form,
  handleChange,
  selectNcr,
  error,
  isSubmitting,
  onSubmit,
  locations,
  locationsLoading,
  users,
  usersLoading,
  allReports
}) {
  const [isLinkingMode, setIsLinkingMode] = useState(false)
  const [ncrSearchQuery, setNcrSearchQuery] = useState('')

  if (!isOpen) return null

  const checkboxFields = [
    { key: 'holes_punctures', label: 'HOLES & PUNCTURES' },
    { key: 'deformed_torn', label: 'DEFORMED OR TORN' },
    { key: 'open_carton', label: 'OPEN CARTON' },
    { key: 'crushed_dented', label: 'CRUSHED OR DENTED' },
    { key: 'wet_leaked', label: 'WET OR LEAKED' },
    { key: 'stain_graffiti', label: 'STAIN OR GRAFFITI' },
    { key: 'bulging', label: 'BULGING' },
    { key: 'improper_stretch_wrapping', label: 'IMPROPER STRETCH WRAPPING' },
    { key: 'wrong_no_batchcode', label: 'WRONG/NO BATCHCODE' },
    { key: 'opened_seal', label: 'OPENED SEAL' },
    { key: 'no_label_broken_label', label: 'NO LABEL/BROKEN LABEL' },
    { key: 'short_pack', label: 'SHORT PACK' },
    { key: 'excess_shipment', label: 'EXCESS SHIPMENT' },
    { key: 'documentation_error', label: 'DOCUMENTATION ERROR' },
    { key: 'picking_discrepancy', label: 'PICKING DISCREPANCY' }
  ]

  const sortedReports = [...(allReports || [])].sort((a, b) => {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '90vh',
          width: isLinkingMode ? '600px' : '900px',
          maxWidth: '95vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <button type="button" onClick={onClose} className="modal-close-button" style={{ zIndex: 10 }}>
          <CloseIcon size={18} />
        </button>
        <div className="modal-header-row" style={{ flexShrink: 0, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="reports-update-title">{isLinkingMode ? 'Select NCR to Link' : 'Quality Defects / Damaged / Discrepancy Report (QDDR)'}</h3>
          {!isLinkingMode && (
            <button type="button" className="btn-secondary-light" onClick={() => setIsLinkingMode(true)}>
              {form.ncr_id ? `Linked NCR: ${form.linked_ncr_reference || form.ncr_id} (Change)` : 'Link NCR'}
            </button>
          )}
        </div>

        {error && !isLinkingMode && <div className="user-info-error" style={{ marginBottom: '12px', flexShrink: 0 }}>{error}</div>}

        <div className="modal-form-content" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {isLinkingMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Search reference no..."
                value={ncrSearchQuery}
                onChange={(e) => setNcrSearchQuery(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedReports
                  .filter(r => !ncrSearchQuery || String(r.reference_no || r.id).toLowerCase().includes(ncrSearchQuery.toLowerCase()))
                  .map(report => {
                    const isSelected = String(form.ncr_id) === String(report.id);
                    return (
                      <label 
                        key={report.id}
                        style={{
                          padding: '12px',
                          background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => selectNcr(report.id, report.reference_no || String(report.id))}
                          style={{ marginTop: '4px' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{report.reference_no || `NCR #${report.id}`}</span>
                            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                          {report.description && (
                            <span style={{ color: 'var(--muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {report.description}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
          ) : (
          <form className="modal-form" onSubmit={onSubmit} style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>

            {/* Row 1: Location, Date, Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Location:"
                  value={form.location}
                  onValueChange={(val) => handleChange('location', val)}
                  options={locations}
                  loading={locationsLoading}
                  placeholder="Search location..."
                  onSelectOption={(opt) => handleChange('location', opt.label)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Date:</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Time:</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Row 2: Trucker/Broker, Plate Number, Container Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Trucker / Broker:</label>
                <input
                  type="text"
                  value={form.trucker_broker}
                  onChange={(e) => handleChange('trucker_broker', e.target.value)}
                  className="input-field"
                  placeholder="e.g. YCH logistics"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Plate Number:</label>
                <input
                  type="text"
                  value={form.plate_number}
                  onChange={(e) => handleChange('plate_number', e.target.value)}
                  className="input-field"
                  placeholder="e.g. ABC 123"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Container Number:</label>
                <input
                  type="text"
                  value={form.container_number}
                  onChange={(e) => handleChange('container_number', e.target.value)}
                  className="input-field"
                  placeholder="e.g. CAXU6439352"
                />
              </div>
            </div>

            {/* Row 3: PO Reference, DR/WB Number, Brand/Supplier */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">PO Reference:</label>
                <input
                  type="text"
                  value={form.po_reference}
                  onChange={(e) => handleChange('po_reference', e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">DR / WB Number:</label>
                <input
                  type="text"
                  value={form.drwb_number}
                  onChange={(e) => handleChange('drwb_number', e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Brand / Supplier:</label>
                <input
                  type="text"
                  value={form.brand_supplier}
                  onChange={(e) => handleChange('brand_supplier', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />

            {/* Row 4: Material Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Material Description:</label>
                <input
                  type="text"
                  value={form.material_description}
                  onChange={(e) => handleChange('material_description', e.target.value)}
                  className="input-field"
                  placeholder="Description..."
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Material Code:</label>
                <input
                  type="text"
                  value={form.material_code}
                  onChange={(e) => handleChange('material_code', e.target.value)}
                  className="input-field"
                  placeholder="Code..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Batch Code / ISU No:</label>
                <input
                  type="text"
                  value={form.batch_code_su_number}
                  onChange={(e) => handleChange('batch_code_su_number', e.target.value)}
                  className="input-field"
                  placeholder="Batch..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="label-field">Quantity:</label>
                <input
                  type="number"
                  value={form.qty}
                  onChange={(e) => handleChange('qty', e.target.value)}
                  className="input-field"
                  placeholder="Qty..."
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />

            <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 4px 0', textAlign: 'center', letterSpacing: '0.05em' }}>TYPE OF DISCREPANCY</h4>
            
            {/* Discrepancies Grid & Others */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {checkboxFields.map(field => (
                <label key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.checked)}
                  /> {field.label}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
              <label className="label-field">Others, Pls. Specify:</label>
              <input
                type="text"
                value={form.others}
                onChange={(e) => handleChange('others', e.target.value)}
                className="input-field"
                placeholder="Specify other discrepancy..."
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />

            {/* Details: Reason, Corrective, Preventive */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="label-field">Reason of Discrepancy:</label>
                <textarea
                  value={form.reason_of_discrepancy}
                  onChange={(e) => handleChange('reason_of_discrepancy', e.target.value)}
                  className="input-field"
                  required
                  style={{ height: '80px', padding: '8px', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="label-field">Corrective Action:</label>
                <textarea
                  value={form.corrective_action}
                  onChange={(e) => handleChange('corrective_action', e.target.value)}
                  className="input-field"
                  style={{ height: '80px', padding: '8px', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="label-field">Preventive Action:</label>
                <textarea
                  value={form.preventive_action}
                  onChange={(e) => handleChange('preventive_action', e.target.value)}
                  className="input-field"
                  style={{ height: '80px', padding: '8px', resize: 'none' }}
                />
              </div>
            </div>

            {/* Signature / Approval Roles: Leader, Approved By, Noted By */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Leader / Supervisor:"
                  value={form.leader}
                  onValueChange={(val) => handleChange('leader', val)}
                  options={users}
                  loading={usersLoading}
                  placeholder="Search leader..."
                  onSelectOption={(opt) => handleChange('leader', opt.label)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Approved By:"
                  value={form.approved_by}
                  onValueChange={(val) => handleChange('approved_by', val)}
                  options={users}
                  loading={usersLoading}
                  placeholder="Search user..."
                  onSelectOption={(opt) => handleChange('approved_by', opt.label)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Noted By:"
                  value={form.noted_by}
                  onValueChange={(val) => handleChange('noted_by', val)}
                  options={users}
                  loading={usersLoading}
                  placeholder="Search user..."
                  onSelectOption={(opt) => handleChange('noted_by', opt.label)}
                />
              </div>
            </div>

          </form>
          )}
        </div>

        <div 
          className="modal-footer-actions"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 0 0 0',
            background: 'transparent',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            marginTop: '12px'
          }}
        >
          {isLinkingMode ? (
            <button type="button" className="btn-gradient-primary" onClick={() => setIsLinkingMode(false)} style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}>
              Done
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary-light" onClick={onClose} disabled={isSubmitting} style={{ margin: 0, padding: '8px 20px', fontSize: '13px' }}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-gradient-primary" 
                disabled={isSubmitting}
                onClick={onSubmit}
                style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}
              >
                {isSubmitting ? 'Submitting…' : 'Submit QDDR'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default QDDRModal
