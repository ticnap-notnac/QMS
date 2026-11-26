import { useEffect, useRef, useState, useMemo } from 'react'
import { X as CloseIcon, Sparkles, LoaderCircle, ScanLine, Upload, Camera, CheckCircle2, FileText, Database, Truck, Package, AlertTriangle, CheckSquare, Search, ChevronDown, Plus } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'

const CHECKBOX_FIELDS = [
  { key: 'holes_punctures', label: 'Holes & Punctures' },
  { key: 'deformed_torn', label: 'Deformed or Torn' },
  { key: 'open_carton', label: 'Open Carton' },
  { key: 'crushed_dented', label: 'Crushed or Dented' },
  { key: 'wet_leaked', label: 'Wet or Leaked' },
  { key: 'stain_graffiti', label: 'Stain or Graffiti' },
  { key: 'bulging', label: 'Bulging' },
  { key: 'improper_stretch_wrapping', label: 'Improper Stretch Wrapping' },
  { key: 'wrong_no_batchcode', label: 'Wrong / No Batch Code' },
  { key: 'opened_seal', label: 'Opened Seal' },
  { key: 'no_label_broken_label', label: 'No Label / Broken Label' },
  { key: 'short_pack', label: 'Short Pack' },
  { key: 'excess_shipment', label: 'Excess Shipment' },
  { key: 'documentation_error', label: 'Documentation Error' },
  { key: 'picking_discrepancy', label: 'Picking Discrepancy' }
]

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
  handleLookupInventoryBySu,
  evidenceItems = [],
  evidenceError = null,
  handleEvidenceFiles,
  removeEvidenceFile,
  products = [],
  productsLoading = false
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

  const checkboxFields = CHECKBOX_FIELDS

  const [discrepancySearch, setDiscrepancySearch] = useState('')
  const [isDiscrepancyDropdownOpen, setIsDiscrepancyDropdownOpen] = useState(false)
  const discrepancyDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (discrepancyDropdownRef.current && !discrepancyDropdownRef.current.contains(e.target)) {
        setIsDiscrepancyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setDiscrepancySearch('')
      setIsDiscrepancyDropdownOpen(false)
    }
  }, [isOpen])

  const filteredDiscrepancyFields = useMemo(() => {
    const q = discrepancySearch.trim().toLowerCase()
    if (!q) return checkboxFields
    return checkboxFields.filter(f => f.label.toLowerCase().includes(q))
  }, [discrepancySearch, checkboxFields])

  const selectedDiscrepancies = useMemo(() => {
    return checkboxFields.filter(f => Boolean(form?.[f.key]))
  }, [form, checkboxFields])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: isMobile ? 'calc(100vh - 16px)' : '92vh',
          width: isMobile ? 'calc(100vw - 16px)' : '920px',
          maxWidth: '96vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.2)',
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

        {/* ── 📋 QDDR HEADER ROW ── */}
        <div 
          className="modal-header-row" 
          style={{ 
            flexShrink: 0, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingLeft: isMobile ? '16px' : '28px',
            paddingRight: isMobile ? '40px' : '56px',
            paddingTop: isMobile ? '14px' : '20px',
            paddingBottom: isMobile ? '12px' : '16px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div>
            <h3 className="reports-update-title" style={{ margin: 0, fontSize: isMobile ? '15px' : '17px' }}>
              Quality Defects / Damaged / Discrepancy Report (QDDR)
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Record damaged goods, delivery discrepancies, and transport defects for QA inspection.
            </p>
          </div>
        </div>

        {error && <div className="user-info-error" style={{ margin: '12px 28px 0 28px', flexShrink: 0 }}>{error}</div>}

        <div className="modal-form-content" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 14px' : '20px 28px', background: '#f8fafc' }}>
          <form className="modal-form" onSubmit={onSubmit} style={{ gap: isMobile ? '12px' : '16px', display: 'flex', flexDirection: 'column' }}>

              {/* ── SECTION 1: Material & Item Details ── */}
              <div className="qddr-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="qddr-section-title" style={{ margin: 0 }}>
                      <Package size={15} color="#0891b2" />
                      <span>1. Material &amp; Item Details</span>
                    </div>
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
                      className="qddr-action-btn"
                      style={{
                        background: isScannerOpen ? 'rgba(8, 145, 178, 0.2)' : 'rgba(8, 145, 178, 0.08)',
                        border: '1px solid rgba(8, 145, 178, 0.35)',
                        color: '#0891b2'
                      }}
                    >
                      <ScanLine size={13} />
                      {isScannerOpen ? 'Close Scanner' : 'Scan Barcode / Label'}
                    </button>

                    <button
                      type="button"
                      onClick={() => labelFileInputRef.current && labelFileInputRef.current.click()}
                      disabled={scanningLabel}
                      className="qddr-action-btn"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#1A435A'
                      }}
                    >
                      {scanningLabel ? (
                        <>
                          <LoaderCircle size={13} className="iso-spinner" /> Scanning Label...
                        </>
                      ) : (
                        <>
                          <Upload size={13} /> Upload Barcode Image
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

                {/* ── Top Lookup Row: Batch / ISU No. with Pull IM Info right beside it ── */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <label className="label-field" style={{ margin: 0, fontWeight: 700, color: '#1A435A', fontSize: '13px' }}>
                      Batch / ISU No: <span className="required-asterisk">*</span>
                    </label>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Enter batch code to auto-populate material &amp; shipment info
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={form.batch_code_su_number}
                      onChange={(e) => handleChange('batch_code_su_number', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (handleLookupInventoryBySu) handleLookupInventoryBySu();
                        }
                      }}
                      className="input-field"
                      placeholder="e.g. 10SE27JST2 (type code & click Pull IM Info)"
                      required
                      style={{ flex: 1, minWidth: 0, background: '#ffffff', height: '40px' }}
                    />

                    {handleLookupInventoryBySu && (
                      <button
                        type="button"
                        onClick={handleLookupInventoryBySu}
                        disabled={scanningLabel}
                        title="Pull PO, DR/WB, Supplier, Trucker & Logistics details from External Inventory System"
                        className="qddr-action-btn"
                        style={{
                          background: 'rgba(8, 145, 178, 0.1)',
                          border: '1.5px solid #0891b2',
                          color: '#0891b2',
                          fontWeight: 600,
                          fontSize: '13px',
                          padding: '0 18px',
                          height: '40px',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          flexShrink: 0
                        }}
                      >
                        <Database size={15} /> Pull IM Info
                      </button>
                    )}
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

                {/* Material Details Grid (Auto-populated from IM) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr',
                  gap: isMobile ? '10px' : '14px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <SearchableDropdown
                      label="Material Description:"
                      value={form.material_description}
                      onValueChange={(val) => handleChange('material_description', val)}
                      options={products}
                      loading={productsLoading}
                      placeholder="e.g. AL Crema Asada Can 48x370ml (Exp: 10.09.2027)"
                      onSelectOption={(opt) => handleChange('material_description', opt.label)}
                      required={true}
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
              </div>

              {/* ── SECTION 2: Shipment & Location Details ── */}
              <div className="qddr-form-section">
                <div className="qddr-section-title">
                  <Truck size={15} color="#0891b2" />
                  <span>2. Shipment &amp; Location Details</span>
                </div>

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
                    <label className="label-field">Trucker / Broker:</label>
                    <input
                      type="text"
                      value={form.trucker_broker}
                      onChange={(e) => handleChange('trucker_broker', e.target.value)}
                      className="input-field"
                      placeholder="e.g. YCH Logistics"
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
                <div className="qddr-form-row-3-col">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="label-field">PO Reference:</label>
                    <input
                      type="text"
                      value={form.po_reference}
                      onChange={(e) => handleChange('po_reference', e.target.value)}
                      className="input-field"
                      placeholder="e.g. PO-2026-001"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="label-field">DR / WB Number:</label>
                    <input
                      type="text"
                      value={form.drwb_number}
                      onChange={(e) => handleChange('drwb_number', e.target.value)}
                      className="input-field"
                      placeholder="e.g. DR-88219"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="label-field">Brand / Supplier:</label>
                    <input
                      type="text"
                      value={form.brand_supplier}
                      onChange={(e) => handleChange('brand_supplier', e.target.value)}
                      className="input-field"
                      placeholder="e.g. Alaska Milk Corp"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: Type of Discrepancy ── */}
              <div className="qddr-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="qddr-section-title" style={{ margin: 0 }}>
                    <AlertTriangle size={15} color="#e11d48" />
                    <span>3. Type of Discrepancy</span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>Select all defects that apply</span>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {/* Searchable Multi-Select Dropdown */}
                  <div ref={discrepancyDropdownRef} style={{ position: 'relative', width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: isDiscrepancyDropdownOpen ? '1.5px solid #0891b2' : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        padding: '0 12px',
                        transition: 'all 0.15s ease',
                        boxShadow: isDiscrepancyDropdownOpen ? '0 0 0 3px rgba(8, 145, 178, 0.1)' : 'none'
                      }}
                    >
                      <Search size={15} color="#64748b" style={{ marginRight: '8px', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={discrepancySearch}
                        onChange={(e) => {
                          setDiscrepancySearch(e.target.value)
                          setIsDiscrepancyDropdownOpen(true)
                        }}
                        onFocus={() => setIsDiscrepancyDropdownOpen(true)}
                        placeholder={
                          selectedDiscrepancies.length > 0
                            ? `${selectedDiscrepancies.length} defect${selectedDiscrepancies.length > 1 ? 's' : ''} selected — search or click arrow to toggle...`
                            : "Search or select discrepancy type (e.g. Holes, Crushed, Leaked)..."
                        }
                        style={{
                          border: 'none',
                          outline: 'none',
                          width: '100%',
                          padding: '9px 0',
                          fontSize: '13px',
                          color: '#1e293b',
                          background: 'transparent'
                        }}
                      />
                      {discrepancySearch && (
                        <button
                          type="button"
                          onClick={() => setDiscrepancySearch('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <CloseIcon size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsDiscrepancyDropdownOpen(prev => !prev)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px 0 4px 6px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ChevronDown size={16} style={{ transform: isDiscrepancyDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                      </button>
                    </div>

                    {/* Dropdown Menu */}
                    {isDiscrepancyDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                          maxHeight: '220px',
                          overflowY: 'auto',
                          padding: '6px'
                        }}
                      >
                        {filteredDiscrepancyFields.length > 0 ? (
                          filteredDiscrepancyFields.map((field) => {
                            const isSelected = Boolean(form[field.key])
                            return (
                              <div
                                key={field.key}
                                onClick={() => handleChange(field.key, !isSelected)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  background: isSelected ? '#fef2f2' : 'transparent',
                                  color: isSelected ? '#991b1b' : '#334155',
                                  fontSize: '13px',
                                  fontWeight: isSelected ? 600 : 400,
                                  transition: 'background 0.1s ease',
                                  marginBottom: '2px'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = '#f1f5f9'
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // handled by row click
                                    style={{ accentColor: '#dc2626', cursor: 'pointer', width: '15px', height: '15px' }}
                                  />
                                  <span>{field.label}</span>
                                </div>
                                {isSelected && (
                                  <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>Selected</span>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px', textAlign: 'center' }}>
                            No matching discrepancy found. You can specify it in "Others, Pls. Specify" below.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Discrepancy Chips */}
                  {selectedDiscrepancies.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {selectedDiscrepancies.map(field => (
                        <span
                          key={field.key}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            color: '#991b1b',
                            fontWeight: 600
                          }}
                        >
                          <span>{field.label}</span>
                          <button
                            type="button"
                            onClick={() => handleChange(field.key, false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: '#dc2626',
                              lineHeight: 1
                            }}
                            title={`Remove ${field.label}`}
                          >
                            <CloseIcon size={12} />
                          </button>
                        </span>
                      ))}
                      {selectedDiscrepancies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            checkboxFields.forEach(f => {
                              if (form[f.key]) handleChange(f.key, false)
                            })
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: '4px 6px'
                          }}
                        >
                          Clear All ({selectedDiscrepancies.length})
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                      No defect types selected yet. Search and choose from the dropdown above.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                    <label className="label-field" style={{ marginBottom: 0, fontSize: '12px' }}>Others, Pls. Specify:</label>
                    <input
                      type="text"
                      value={form.others || ''}
                      onChange={(e) => handleChange('others', e.target.value)}
                      className="input-field"
                      placeholder="Specify any other discrepancy not listed above..."
                      style={{ background: '#ffffff' }}
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTIONS 4 & 5: Side-by-Side (Evidence & Actions/Root Cause) ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '12px' : '16px',
                alignItems: 'stretch'
              }}>
                {/* ── SECTION 4: Evidence Upload Section & Reason of Discrepancy ── */}
                <div className="qddr-form-section" style={{ height: '100%', minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="qddr-section-title" style={{ margin: 0 }}>
                      <Camera size={15} color="#0891b2" />
                      <span>4. Evidence / Attachments</span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: evidenceItems.length > 0 ? '#0891b2' : '#64748b',
                      background: evidenceItems.length > 0 ? 'rgba(8, 145, 178, 0.1)' : '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: 600
                    }}>
                      {evidenceItems.length} / 3 uploaded
                    </span>
                  </div>

                  {/* ── Evidence Thumbnails & Inline Upload Slot ── */}
                  {evidenceItems.length > 0 ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {evidenceItems.map((item, idx) => {
                        const isImage = item.type?.includes('image') || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.url || '')
                        return (
                          <div
                            key={`${item.name}-${idx}`}
                            style={{
                              position: 'relative',
                              width: '80px',
                              height: '80px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
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
                                <FileText size={20} color="#0891b2" style={{ marginBottom: '3px' }} />
                                <span style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={item.name}>
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
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '10px',
                                lineHeight: 1
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}

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
                          title="Click or drag to add another evidence file (up to 3)"
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            border: '1.5px dashed #0891b2',
                            background: 'rgba(8, 145, 178, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            cursor: 'pointer',
                            color: '#0891b2',
                            transition: 'all 0.15s ease',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)'
                            e.currentTarget.style.borderColor = '#0e7490'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(8, 145, 178, 0.04)'
                            e.currentTarget.style.borderColor = '#0891b2'
                          }}
                        >
                          <Plus size={22} strokeWidth={2.4} />
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>Add More</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Empty State: Full Width Drag & Drop Zone ── */
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
                        minHeight: '68px',
                        background: '#f8fafc',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '10px',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                        transition: 'border-color 0.2s ease, background 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1A435A', fontSize: '12px', fontWeight: 600 }}>
                        <Upload size={15} color="#0891b2" />
                        <span>Click or drag to upload evidence</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        Supports JPG, PNG, PDF, or DOC (up to 3 files)
                      </div>
                    </div>
                  )}

                  {/* Hidden File Input */}
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

                  {evidenceError && (
                    <div style={{ color: '#dc2626', fontSize: '12px' }}>
                      {evidenceError}
                    </div>
                  )}

                  {/* ── Reason of Discrepancy Below Evidence Upload ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <label className="label-field" style={{ marginBottom: 0, fontWeight: 600 }}>
                        Reason of Discrepancy:
                      </label>
                      {generateReasonFromEvidence && (
                        <button
                          type="button"
                          onClick={() => generateReasonFromEvidence({ silent: false })}
                          disabled={generatingReason}
                          title="Analyze the uploaded evidence image to generate Reason of Discrepancy"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
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
                          {generatingReason ? 'Analyzing Image...' : 'Image to Description'}
                        </button>
                      )}
                    </div>
                    <textarea
                      value={form.reason_of_discrepancy}
                      onChange={(e) => handleChange('reason_of_discrepancy', e.target.value)}
                      placeholder="Upload an evidence photo and click 'Image to Description', or type reason..."
                      className="input-field"
                      style={{ width: '100%', flex: 1, minHeight: '140px', padding: '10px 12px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* ── SECTION 5: Actions ── */}
                <div className="qddr-form-section" style={{ height: '100%', minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div className="qddr-section-title" style={{ margin: 0 }}>
                      <Sparkles size={15} color="#0891b2" />
                      <span>5. Actions</span>
                    </div>
                    <button
                      type="button"
                      onClick={suggestActions}
                      disabled={suggesting}
                      className="qddr-action-btn"
                      style={{
                        background: 'rgba(8, 145, 178, 0.12)',
                        border: '1px solid rgba(8, 145, 178, 0.35)',
                        color: '#0891b2'
                      }}
                    >
                      <Sparkles size={13} /> {suggesting ? 'Analyzing with CBR...' : 'Suggest Actions (CBR)'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <label className="label-field" style={{ marginBottom: 0, fontWeight: 600 }}>
                        Corrective Action:
                      </label>
                      <textarea
                        value={form.corrective_action}
                        onChange={(e) => handleChange('corrective_action', e.target.value)}
                        placeholder="Enter corrective action..."
                        className="input-field"
                        style={{ width: '100%', flex: 1, minHeight: '95px', padding: '10px 12px', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <label className="label-field" style={{ marginBottom: 0, fontWeight: 600 }}>
                        Preventive Action:
                      </label>
                      <textarea
                        value={form.preventive_action}
                        onChange={(e) => handleChange('preventive_action', e.target.value)}
                        placeholder="Enter preventive action..."
                        className="input-field"
                        style={{ width: '100%', flex: 1, minHeight: '95px', padding: '10px 12px', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 6: Signatures & Routing ── */}
              <div className="qddr-form-section">
                <div className="qddr-section-title">
                  <CheckSquare size={15} color="#0891b2" />
                  <span>6. Signatures &amp; Routing</span>
                </div>
                <div className="qddr-form-row-3-col">
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
            padding: isMobile ? '12px 14px' : '16px 28px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0'
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
