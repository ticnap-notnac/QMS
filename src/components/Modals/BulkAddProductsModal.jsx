import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Download, FileText, CheckCircle2, AlertCircle, LoaderCircle, Layers } from 'lucide-react'
import SubmissionLoadingOverlay from '../UI/SubmissionLoadingOverlay.jsx'

export default function BulkAddProductsModal({
  isOpen,
  onClose,
  onSubmit,
  existingProducts = [],
  productTypes = [],
  loading = false
}) {
  const [activeTab, setActiveTab] = useState('paste') // 'paste' | 'csv'
  const [textInput, setTextInput] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [csvItems, setCsvItems] = useState([])
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('')
  const [validationError, setValidationError] = useState('')

  // Map of existing product names for quick duplicate detection
  const existingNameSet = useMemo(() => {
    return new Set((existingProducts || []).map((p) => String(p.product_name || '').trim().toLowerCase()))
  }, [existingProducts])

  // Map of product types for name-to-id resolution
  const productTypeMap = useMemo(() => {
    const map = new Map()
    for (const pt of productTypes || []) {
      const name = String(pt.product_type_name || pt.product_name || '').trim().toLowerCase()
      if (name) map.set(name, pt.id)
    }
    return map
  }, [productTypes])

  // Parse items from Quick Paste
  const parsedPastedItems = useMemo(() => {
    if (!textInput.trim()) return []
    const lines = textInput.split(/\r?\n/)
    const items = []
    const seen = new Set()

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const lower = trimmed.toLowerCase()
      const isDuplicateInInput = seen.has(lower)
      seen.add(lower)
      const isExisting = existingNameSet.has(lower)

      items.push({
        productName: trimmed,
        productTypeId: selectedProductTypeId || null,
        isExisting,
        isDuplicateInInput
      })
    }
    return items
  }, [textInput, selectedProductTypeId, existingNameSet])

  // Parse items from CSV
  const parseCsvText = (text) => {
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return []

    // Split CSV respecting quotation marks
    const parseLine = (line) => {
      const res = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') {
          inQuotes = !inQuotes
        } else if (c === ',' && !inQuotes) {
          res.push(cur.trim())
          cur = ''
        } else {
          cur += c
        }
      }
      res.push(cur.trim())
      return res.map((v) => v.replace(/^"|"$/g, '').trim())
    }

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s\-_]+/g, '_'))
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('product'))
    const typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('category'))

    const parsed = []
    const seen = new Set()

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i])
      const rawName = nameIdx !== -1 ? values[nameIdx] : values[0]
      const rawType = typeIdx !== -1 ? values[typeIdx] : ''
      const name = String(rawName || '').trim()
      if (!name) continue

      const lower = name.toLowerCase()
      const isDuplicateInInput = seen.has(lower)
      seen.add(lower)
      const isExisting = existingNameSet.has(lower)

      let resolvedTypeId = selectedProductTypeId || null
      if (rawType) {
        const foundId = productTypeMap.get(rawType.toLowerCase())
        if (foundId) resolvedTypeId = foundId
      }

      parsed.push({
        productName: name,
        productTypeId: resolvedTypeId,
        productTypeName: rawType || null,
        isExisting,
        isDuplicateInInput
      })
    }
    return parsed
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    setValidationError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result
        const items = parseCsvText(content)
        if (items.length === 0) {
          setValidationError('No valid products found in CSV. Please make sure there is a header and at least one product row.')
        }
        setCsvItems(items)
      } catch (err) {
        setValidationError('Failed to parse CSV file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleDownloadTemplate = () => {
    const header = 'product_name,product_type\n'
    const sampleRows = [
      'Alaskan Evaporated Milk 370ml,Dairy',
      'Sweetened Condensed Milk 300ml,Dairy',
      'Chocolate Drink 250ml,Beverages'
    ].join('\n')

    const blob = new Blob([header + sampleRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'products_bulk_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const currentItems = activeTab === 'paste' ? parsedPastedItems : csvItems
  const validItemsToAdd = currentItems.filter((item) => !item.isExisting && !item.isDuplicateInInput)
  const existingCount = currentItems.filter((item) => item.isExisting).length
  const duplicateCount = currentItems.filter((item) => item.isDuplicateInInput).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (validItemsToAdd.length === 0) {
      setValidationError('No new valid products to add. Existing or duplicate products will be skipped.')
      return
    }

    setValidationError('')
    const payload = validItemsToAdd.map((item) => ({
      productName: item.productName,
      productTypeId: item.productTypeId || null
    }))

    await onSubmit(payload)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={onClose}>
      <SubmissionLoadingOverlay isOpen={loading} message="Bulk adding products..." />
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-products-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} color="#1A435A" />
            <h2 id="bulk-products-title" className="modal-title" style={{ margin: 0 }}>
              Bulk Add Products
            </h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', padding: '0 24px', background: '#f8fafc', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: activeTab === 'paste' ? '#1A435A' : '#64748b',
              borderBottom: activeTab === 'paste' ? '3px solid #1A435A' : '3px solid transparent'
            }}
          >
            Quick Paste
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: activeTab === 'csv' ? '#1A435A' : '#64748b',
              borderBottom: activeTab === 'csv' ? '3px solid #1A435A' : '3px solid transparent'
            }}
          >
            Upload CSV
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {validationError && (
              <div className="user-info-error" style={{ marginBottom: '14px' }}>
                {validationError}
              </div>
            )}

            {/* Optional default Product Type assignment */}
            {productTypes && productTypes.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label className="panel-column">
                  <span className="small-label">Default Product Type (Optional):</span>
                  <select
                    value={selectedProductTypeId}
                    onChange={(e) => setSelectedProductTypeId(e.target.value)}
                    className="form-input-reports"
                    style={{ maxWidth: '320px' }}
                  >
                    <option value="">-- No Product Type (Unassigned) --</option>
                    {productTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.product_type_name || pt.product_name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="glass-card-subtext" style={{ marginTop: '4px', fontSize: '12px' }}>
                  Applied to products unless specified differently in the CSV.
                </p>
              </div>
            )}

            {activeTab === 'paste' ? (
              <div style={{ marginBottom: '16px' }}>
                <label className="panel-column">
                  <span className="small-label">Product Names (one per line):</span>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Evaporated Milk 370ml&#10;Condensed Milk 300g&#10;All Purpose Cream 250ml&#10;Pasteurized Whole Milk 1L"
                    className="form-input-reports"
                    style={{ resize: 'vertical', minHeight: '120px', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </label>
                <p className="glass-card-subtext" style={{ marginTop: '4px', fontSize: '12px' }}>
                  Paste or type product names. Duplicates and blank lines will be automatically identified.
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="small-label">Upload CSV File:</span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <Download size={14} /> Download CSV Template
                  </button>
                </div>

                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('product-csv-input')?.click()}
                >
                  <input
                    id="product-csv-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <Upload size={32} color="#64748b" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#1A435A', fontSize: '14px' }}>
                    {csvFileName ? `Selected: ${csvFileName}` : 'Click or drag a CSV file here'}
                  </p>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Columns supported: product_name, product_type
                  </span>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {currentItems.length > 0 && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A435A' }}>
                    Preview ({currentItems.length} detected)
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                      {validItemsToAdd.length} Ready
                    </span>
                    {existingCount > 0 && (
                      <span style={{ color: '#b45309', fontWeight: 600, background: '#fef3c7', padding: '2px 8px', borderRadius: '12px' }}>
                        {existingCount} Already in DB (skip)
                      </span>
                    )}
                    {duplicateCount > 0 && (
                      <span style={{ color: '#b91c1c', fontWeight: 600, background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                        {duplicateCount} Duplicate in list (skip)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>#</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Product Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((item, idx) => {
                        let statusText = 'Ready to add'
                        let statusColor = '#15803d'
                        let bgColor = 'transparent'

                        if (item.isExisting) {
                          statusText = 'Already exists in system'
                          statusColor = '#b45309'
                          bgColor = '#fffbeb'
                        } else if (item.isDuplicateInInput) {
                          statusText = 'Duplicate row in input'
                          statusColor = '#b91c1c'
                          bgColor = '#fef2f2'
                        }

                        return (
                          <tr key={idx} style={{ background: bgColor, borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 12px', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 12px', fontWeight: 500, color: '#1A435A' }}>
                              {item.productName}
                            </td>
                            <td style={{ padding: '6px 12px', color: statusColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {!item.isExisting && !item.isDuplicateInInput ? (
                                <CheckCircle2 size={14} color="#15803d" />
                              ) : (
                                <AlertCircle size={14} color={statusColor} />
                              )}
                              {statusText}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="modal-submit-row" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #cbd5e1', margin: 0 }}>
            <button
              type="button"
              className="btn-secondary-light"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn-gradient-primary"
              type="submit"
              disabled={loading || validItemsToAdd.length === 0}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <LoaderCircle size={16} className="iso-spinner" /> Adding...
                </span>
              ) : (
                `Add ${validItemsToAdd.length} Product${validItemsToAdd.length === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
