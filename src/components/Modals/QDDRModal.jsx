import { useEffect, useRef, useState } from 'react'
import { X as CloseIcon, Sparkles, LoaderCircle, ScanLine, Upload, Camera, CheckCircle2, FileText } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'

function QDDRModal({
  isOpen,
  onClose,
  form,
  handleChange,
  error,
  isSubmitting,
  onSubmit,
  locations,
  locationsLoading,
  users,
  usersLoading,
  suggesting,
  suggestActions,
  generatingReason,
  generateReasonFromEvidence,
  scanningLabel,
  scanMessage,
  handleScanLabel,
  evidenceItems = [],
  evidenceError = null,
  handleEvidenceFiles,
  removeEvidenceFile
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const labelFileInputRef = useRef(null)
  const evidenceFileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    if (!isOpen || !isScannerOpen) {
      stopCamera()
      return
    }

    let cancelled = false
    const startCamera = async () => {
      setCameraError('')
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera access is not supported in this browser. Please use "Upload Barcode / Label Image".')
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }

        // Optional native BarcodeDetector loop for live 1D/2D barcode auto-trigger
        if ('BarcodeDetector' in window) {
          try {
            const detector = new window.BarcodeDetector()
            scanIntervalRef.current = setInterval(async () => {
              if (!videoRef.current || videoRef.current.readyState < 2 || scanningLabel) return
              try {
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  const detectedValue = barcodes[0].rawValue
                  const canvas = document.createElement('canvas')
                  canvas.width = videoRef.current.videoWidth || 640
                  canvas.height = videoRef.current.videoHeight || 480
                  const ctx = canvas.getContext('2d')
                  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
                  const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85)
                  setIsScannerOpen(false)
                  stopCamera()
                  if (handleScanLabel) {
                    await handleScanLabel({ imageFileOrDataUrl: frameDataUrl, rawBarcode: detectedValue })
                  }
                }
              } catch {
                // ignore frame detection error
              }
            }, 900)
          } catch {
            // BarcodeDetector initialization failed, fallback to manual capture button
          }
        }
      } catch (err) {
        setCameraError('Could not access camera. Please check camera permissions or upload a label photo instead.')
      }
    }

    startCamera()
    return () => {
      cancelled = true
      stopCamera()
    }
  }, [isOpen, isScannerOpen])

  const handleCaptureCameraFrame = async () => {
    if (!videoRef.current || !handleScanLabel) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 1280
    canvas.height = videoRef.current.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setIsScannerOpen(false)
    stopCamera()
    await handleScanLabel({ imageFileOrDataUrl: frameDataUrl })
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: isMobile ? 'calc(100vh - 16px)' : '90vh',
          width: isMobile ? 'calc(100vw - 16px)' : '900px',
          maxWidth: '95vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          transform: isMobile ? 'scale(0.84)' : 'none',
          transformOrigin: 'top center'
        }}
      >
        {/* ── ✕ ABSOLUTE CLOSE BUTTON (Safely isolated in the upper right) ── */}
        <button 
          type="button" 
          onClick={onClose} 
          className="modal-close-button" 
          title="Close Modal"
          aria-label="Close Modal"
          style={{ 
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            background: 'none',
            border: 'none',
            color: 'var(--muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <CloseIcon size={18} />
        </button>

        {/* ── 📋 QDDR HEADER ROW — SHIFTED SAFELY AWAY FROM THE CLOSE TRIGGER ── */}
        <div 
          className="modal-header-row" 
          style={{ 
            flexShrink: 0, 
            marginBottom: isMobile ? '10px' : '16px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingLeft: isMobile ? '16px' : '28px',
            paddingRight: isMobile ? '40px' : '48px',
            paddingTop: isMobile ? '14px' : '24px'
          }}
        >
          <h3 className="reports-update-title" style={{ margin: 0 }}>
            Quality Defects / Damaged / Discrepancy Report (QDDR)
          </h3>
        </div>

        {error && <div className="user-info-error" style={{ marginBottom: '12px', flexShrink: 0, marginLeft: isMobile ? '16px' : '28px', marginRight: isMobile ? '16px' : '28px' }}>{error}</div>}

        <div className="modal-form-content" style={{ flex: 1, overflowY: 'auto', paddingLeft: isMobile ? '14px' : '28px', paddingRight: isMobile ? '14px' : '28px', paddingBottom: isMobile ? '14px' : '24px' }}>
          <form className="modal-form" onSubmit={onSubmit} style={{ gap: isMobile ? '10px' : '16px', display: 'flex', flexDirection: 'column' }}>

              {/* Row 1: Location (Date and Time are automatically recorded on submission) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SearchableDropdown
                  label="Location:"
                  value={form.location}
                  onValueChange={(val) => handleChange('location', val)}
                  options={locations}
                  loading={locationsLoading}
                  placeholder="Search location..."
                  onSelectOption={(opt) => handleChange('location', opt.label)}
                  required={true}
                />
              </div>

              {/* Row 2: Trucker/Broker, Plate Number, Container Number */}
              <div className="qddr-form-row-3-col">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Trucker / Broker:
                  </label>
                  <input
                    type="text"
                    value={form.trucker_broker}
                    onChange={(e) => handleChange('trucker_broker', e.target.value)}
                    className="input-field"
                    placeholder="e.g. YCH logistics"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Plate Number:
                  </label>
                  <input
                    type="text"
                    value={form.plate_number}
                    onChange={(e) => handleChange('plate_number', e.target.value)}
                    className="input-field"
                    placeholder="e.g. ABC 123"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Container Number:
                  </label>
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
              <div className="qddr-form-row-3-col">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    PO Reference:
                  </label>
                  <input
                    type="text"
                    value={form.po_reference}
                    onChange={(e) => handleChange('po_reference', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    DR / WB Number:
                  </label>
                  <input
                    type="text"
                    value={form.drwb_number}
                    onChange={(e) => handleChange('drwb_number', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Brand / Supplier:
                  </label>
                  <input
                    type="text"
                    value={form.brand_supplier}
                    onChange={(e) => handleChange('brand_supplier', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

              {/* Material & Barcode / Pallet Label Scanner Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#1A435A', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Material &amp; Label Details
                  </span>
                  {scanMessage && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      color: '#059669',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: 500
                    }}>
                      <CheckCircle2 size={12} /> {scanMessage}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(prev => !prev)}
                    disabled={scanningLabel}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: isScannerOpen ? 'rgba(8, 145, 178, 0.2)' : 'rgba(8, 145, 178, 0.1)',
                      border: '1px solid rgba(8, 145, 178, 0.35)',
                      color: '#0891b2',
                      borderRadius: '6px',
                      cursor: scanningLabel ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ScanLine size={14} />
                    {isScannerOpen ? 'Close Scanner' : 'Scan Barcode / Label'}
                  </button>

                  <button
                    type="button"
                    onClick={() => labelFileInputRef.current && labelFileInputRef.current.click()}
                    disabled={scanningLabel}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#1A435A',
                      borderRadius: '6px',
                      cursor: scanningLabel ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {scanningLabel ? (
                      <>
                        <LoaderCircle size={14} className="iso-spinner" /> Scanning Label...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Upload Barcode / Label Image
                      </>
                    )}
                  </button>
                  <input
                    ref={labelFileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file && handleScanLabel) {
                        await handleScanLabel({ imageFileOrDataUrl: file })
                      }
                    }}
                  />
                </div>
              </div>

              {/* Live Camera Barcode / Label Viewfinder */}
              {isScannerOpen && (
                <div style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {cameraError ? (
                    <div style={{ color: '#fca5a5', fontSize: '12.5px', textAlign: 'center', padding: '8px' }}>
                      {cameraError}
                    </div>
                  ) : (
                    <>
                      <div style={{ position: 'relative', width: '100%', maxWidth: '460px', borderRadius: '6px', overflow: 'hidden', border: '2px solid rgba(8, 145, 178, 0.6)' }}>
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block', background: '#000' }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: '16px',
                          border: '1px dashed rgba(56, 189, 248, 0.75)',
                          borderRadius: '6px',
                          pointerEvents: 'none'
                        }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '460px', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                          Point camera at the pallet barcode or sticker to auto-fill fields.
                        </span>
                        <button
                          type="button"
                          onClick={handleCaptureCameraFrame}
                          disabled={scanningLabel}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: '#0891b2',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Camera size={14} /> Capture &amp; Extract
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Row 4: Material Details (Item Description + Expiry, Item Code, Batch Code, Quantity) */}
              <div className="qddr-form-row-material-grid">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Material Description: <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.material_description}
                    onChange={(e) => handleChange('material_description', e.target.value)}
                    className="input-field"
                    placeholder="e.g. AL Crema Asada Can 48x370ml (Exp: 10.09.2027)"
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Material Code: <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.material_code}
                    onChange={(e) => handleChange('material_code', e.target.value)}
                    className="input-field"
                    placeholder="e.g. 1011"
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Batch Code / ISU No: <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.batch_code_su_number}
                    onChange={(e) => handleChange('batch_code_su_number', e.target.value)}
                    className="input-field"
                    placeholder="e.g. 10SE27JST2"
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="label-field">
                    Quantity: <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.qty}
                    onChange={(e) => handleChange('qty', e.target.value)}
                    className="input-field"
                    placeholder="Qty..."
                    min="0"
                    required
                  />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

              <h4 style={{ color: '#1A435A', fontSize: '13px', margin: '0 0 4px 0', textAlign: 'center', letterSpacing: '0.05em' }}>
                TYPE OF DISCREPANCY
              </h4>
              
              {/* Discrepancies Grid & Others */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '10px' : '12px' }}>
                {checkboxFields.map(field => (
                  <label key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
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

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

              {/* Evidence Upload Section (Images, PDF, Word Docs) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#1A435A', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Evidence / Attachments (Max 3 files)
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {evidenceItems.length} / 3 uploaded
                  </span>
                </div>

                {evidenceItems.length > 0 && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {evidenceItems.map((item, idx) => {
                      const isImage = item.type?.includes('image') || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.url || '')
                      return (
                        <div
                          key={`${item.name}-${idx}`}
                          style={{
                            position: 'relative',
                            width: '92px',
                            height: '92px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isImage ? (
                            <img
                              src={item.url}
                              alt={item.name || 'Evidence'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px', textAlign: 'center', color: '#334155', width: '100%' }}>
                              <FileText size={22} color="#0891b2" style={{ marginBottom: '4px' }} />
                              <span style={{ fontSize: '10.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={item.name}>
                                {item.name}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            title="Remove attachment"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (removeEvidenceFile) removeEvidenceFile(idx)
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(15, 23, 42, 0.78)',
                              border: 'none',
                              color: '#ffffff',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '11px',
                              lineHeight: 1
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {evidenceItems.length < 3 && (
                  <div
                    onClick={() => evidenceFileInputRef.current && evidenceFileInputRef.current.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (e.dataTransfer?.files?.length && handleEvidenceFiles) {
                        handleEvidenceFiles(Array.from(e.dataTransfer.files))
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: '56px',
                      background: '#f8fafc',
                      border: '1.5px dashed #94a3b8',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '10px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease, background 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '12.5px', fontWeight: 500 }}>
                      <Upload size={16} color="#0891b2" />
                      <span>Click or drop to upload evidence (Images, PDF, DOC)</span>
                    </div>
                    <input
                      ref={evidenceFileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files?.length && handleEvidenceFiles) {
                          handleEvidenceFiles(Array.from(e.target.files))
                        }
                        e.target.value = ''
                      }}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}

                {evidenceError && (
                  <div style={{ color: '#dc2626', fontSize: '12px' }}>
                    {evidenceError}
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

              {/* Actions & Analysis Header with CBR Suggest Actions Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#1A435A', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions & Analysis</span>
                <button
                  type="button"
                  onClick={suggestActions}
                  disabled={suggesting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    background: 'rgba(8, 145, 178, 0.12)',
                    border: '1px solid rgba(8, 145, 178, 0.3)',
                    color: '#0891b2',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={13} /> {suggesting ? 'Analyzing...' : 'Suggest Actions (CBR)'}
                </button>
              </div>

              {/* Details: Reason, Corrective, Preventive */}
              <div className="qddr-form-row-3-col" style={isMobile ? { gridTemplateColumns: '1fr', gap: '10px' } : undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <label className="label-field" style={{ marginBottom: 0 }}>
                      Reason of Discrepancy:
                    </label>
                    {generateReasonFromEvidence && (
                      <button
                        type="button"
                        onClick={() => generateReasonFromEvidence({ silent: false })}
                        disabled={generatingReason}
                        title="Use required fields and uploaded evidence photo to fill Reason of Discrepancy"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: 'rgba(8, 145, 178, 0.12)',
                          border: '1px solid rgba(8, 145, 178, 0.3)',
                          color: '#0891b2',
                          borderRadius: '4px',
                          cursor: generatingReason ? 'not-allowed' : 'pointer',
                          opacity: generatingReason ? 0.65 : 1
                        }}
                      >
                        {generatingReason ? <LoaderCircle size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {generatingReason ? 'Filling...' : 'Auto-Fill Reason'}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={form.reason_of_discrepancy}
                    onChange={(e) => handleChange('reason_of_discrepancy', e.target.value)}
                    placeholder="Auto-fills when required fields and an evidence photo are provided, or click Auto-Fill Reason..."
                    className="input-field"
                    style={{ height: '80px', padding: '8px', resize: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">
                    Corrective Action:
                  </label>
                  <textarea
                    value={form.corrective_action}
                    onChange={(e) => handleChange('corrective_action', e.target.value)}
                    className="input-field"
                    style={{ height: '80px', padding: '8px', resize: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="label-field">
                    Preventive Action:
                  </label>
                  <textarea
                    value={form.preventive_action}
                    onChange={(e) => handleChange('preventive_action', e.target.value)}
                    className="input-field"
                    style={{ height: '80px', padding: '8px', resize: 'none' }}
                  />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

              {/* Signature / Approval Roles: Leader, Approved By, Noted By */}
              <div className="qddr-form-row-3-col" style={isMobile ? { marginTop: '4px', gridTemplateColumns: '1fr', gap: '10px' } : { marginTop: '4px' }}>
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
        </div>

        {/* ── MODAL FOOTER ACTION BAR ── */}
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
          <button type="button" className="btn-secondary-light" onClick={onClose} disabled={isSubmitting} style={{ margin: 0, padding: '8px 20px', fontSize: '13px' }}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn-gradient-primary" 
            onClick={onSubmit}
            disabled={isSubmitting}
            style={{ margin: 0, padding: '8px 24px', fontSize: '13px', height: 'auto', boxShadow: 'none' }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LoaderCircle size={16} className="iso-spinner" /> Submitting…
              </span>
            ) : (form.id ? 'Update QDDR' : 'Submit QDDR')}
          </button>
        </div>

      </div>
    </div>
  )
}

export default QDDRModal
