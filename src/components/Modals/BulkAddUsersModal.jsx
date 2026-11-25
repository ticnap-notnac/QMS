import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Download, Users, CheckCircle2, AlertCircle, LoaderCircle, Copy, Check, Info } from 'lucide-react'
import SubmissionLoadingOverlay from '../UI/SubmissionLoadingOverlay.jsx'
import { isAdminOrSuperAdminRole } from '@/utils/roleUtils.js'

export default function BulkAddUsersModal({
  isOpen,
  onClose,
  onSubmit,
  existingUsers = [],
  availableRoles = [],
  availableDepartments = [],
  availablePositions = [],
  availableSites = [],
  currentUserRole,
  loading = false
}) {
  const [csvFileName, setCsvFileName] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [validationError, setValidationError] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)

  const isActorAdmin = isAdminOrSuperAdminRole(currentUserRole)

  // Lookup maps for fast and case-insensitive resolution
  const lookupMaps = useMemo(() => {
    const rolesMap = new Map()
    for (const r of availableRoles || []) {
      rolesMap.set(String(r.id), r)
      if (r.role_name) rolesMap.set(r.role_name.toLowerCase().trim(), r)
    }

    const deptMap = new Map()
    for (const d of availableDepartments || []) {
      deptMap.set(String(d.id), d)
      if (d.department_name) deptMap.set(d.department_name.toLowerCase().trim(), d)
    }

    const posMap = new Map()
    for (const p of availablePositions || []) {
      posMap.set(String(p.id), p)
      if (p.position_name) posMap.set(p.position_name.toLowerCase().trim(), p)
    }

    const siteMap = new Map()
    for (const s of availableSites || []) {
      siteMap.set(String(s.id), s)
      if (s.site_name) siteMap.set(s.site_name.toLowerCase().trim(), s)
      if (s.site_code) siteMap.set(s.site_code.toLowerCase().trim(), s)
    }

    const existingEmails = new Set(
      (existingUsers || []).map((u) => String(u.email || '').trim().toLowerCase())
    )
    const existingUsernames = new Set(
      (existingUsers || []).map((u) => String(u.user_name || '').trim().toLowerCase())
    )

    return { rolesMap, deptMap, posMap, siteMap, existingEmails, existingUsernames }
  }, [availableRoles, availableDepartments, availablePositions, availableSites, existingUsers])

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = 'first_name,last_name,user_name,email,password,role,department,position,site,contact_number\n'
    const sampleDept = availableDepartments?.[0]?.department_name || 'Quality Assurance'
    const sampleRole = availableRoles?.[0]?.role_name || 'QA Inspector'
    const samplePos = availablePositions?.[0]?.position_name || 'QA Analyst'
    const sampleSite = availableSites?.[0]?.site_name || 'Main Plant'

    const sampleRow1 = `Juan,Dela Cruz,jdelacruz,juan.delacruz@gmail.com,SecurePass123!,${sampleRole},${sampleDept},${samplePos},${sampleSite},09171234567\n`
    const sampleRow2 = `Maria,Santos,msantos,maria.santos@gmail.com,,${sampleRole},${sampleDept},,,09181234567\n`

    const blob = new Blob([headers + sampleRow1 + sampleRow2], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'users_bulk_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Parse CSV
  const parseCsvText = (text) => {
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return []

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
    const parsed = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i])
      const row = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? ''
      })
      parsed.push(row)
    }
    return parsed
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    setValidationError('')
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result
        const rows = parseCsvText(content)
        if (rows.length === 0) {
          setValidationError('No rows found in the CSV file. Please make sure the header row and at least one user record are present.')
        }
        setRawRows(rows)
      } catch (err) {
        setValidationError('Failed to parse CSV file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  // Pre-validate rows and resolve names to IDs
  const evaluatedRows = useMemo(() => {
    const { rolesMap, deptMap, posMap, siteMap, existingEmails, existingUsernames } = lookupMaps
    const seenEmailsInCsv = new Set()
    const seenUsernamesInCsv = new Set()

    return rawRows.map((r, index) => {
      const firstName = String(r.first_name || r.firstname || '').trim()
      const lastName = String(r.last_name || r.lastname || '').trim()
      const userName = String(r.user_name || r.username || '').trim()
      const email = String(r.email || '').trim().toLowerCase()
      const rawPassword = String(r.password || '').trim()
      const rawRole = String(r.role || r.role_name || r.role_id || '').trim().toLowerCase()
      const rawDept = String(r.department || r.department_name || r.department_id || '').trim().toLowerCase()
      const rawPos = String(r.position || r.position_name || r.position_id || '').trim().toLowerCase()
      const rawSite = String(r.site || r.site_name || r.site_code || r.site_id || '').trim().toLowerCase()
      const contactNumber = String(r.contact_number || r.contact || r.phone || '').trim()

      const errors = []

      // Required fields
      if (!firstName) errors.push('First name is required.')
      if (!lastName) errors.push('Last name is required.')
      if (!userName) errors.push('Username is required.')
      if (!email) errors.push('Email is required.')

      // Name characters check
      const invalidNameRegex = /[^a-zA-Z\s\-']/
      if (firstName && invalidNameRegex.test(firstName)) {
        errors.push('First name cannot contain numbers or special characters.')
      }
      if (lastName && invalidNameRegex.test(lastName)) {
        errors.push('Last name cannot contain numbers or special characters.')
      }

      // Email format
      if (email) {
        if (!/@gmail\.com$/i.test(email)) {
          errors.push('Only Gmail addresses (@gmail.com) are allowed.')
        }
        if (existingEmails.has(email)) {
          errors.push('Email is already registered in the system.')
        }
        if (seenEmailsInCsv.has(email)) {
          errors.push('Duplicate email within this CSV file.')
        }
        seenEmailsInCsv.add(email)
      }

      // Username check
      if (userName) {
        if (existingUsernames.has(userName.toLowerCase())) {
          errors.push('Username already exists in the system.')
        }
        if (seenUsernamesInCsv.has(userName.toLowerCase())) {
          errors.push('Duplicate username within this CSV file.')
        }
        seenUsernamesInCsv.add(userName.toLowerCase())
      }

      // Password check (if supplied)
      if (rawPassword && rawPassword.length < 6) {
        errors.push('Password must be at least 6 characters.')
      }

      // Contact number check (if supplied)
      if (contactNumber && !/^\d{11}$/.test(contactNumber)) {
        errors.push('Contact number must be exactly 11 digits.')
      }

      // Department resolution (required)
      let resolvedDeptId = null
      if (rawDept) {
        const foundDept = deptMap.get(rawDept)
        if (foundDept) {
          resolvedDeptId = foundDept.id
        } else {
          errors.push(`Department "${rawDept}" was not found.`)
        }
      } else {
        errors.push('Department is required.')
      }

      // Role resolution (optional, defaults to department role or default user)
      let resolvedRoleId = null
      if (rawRole) {
        const foundRole = rolesMap.get(rawRole)
        if (foundRole) {
          resolvedRoleId = foundRole.id
          if (!isActorAdmin && isAdminOrSuperAdminRole(foundRole.role_name)) {
            errors.push('Only Administrators can assign Administrator roles.')
          }
        } else {
          errors.push(`Role "${rawRole}" was not found.`)
        }
      }

      // Position resolution (optional)
      let resolvedPosId = null
      if (rawPos) {
        const foundPos = posMap.get(rawPos)
        if (foundPos) {
          resolvedPosId = foundPos.id
        } else {
          errors.push(`Position "${rawPos}" was not found.`)
        }
      }

      // Site resolution (optional)
      let resolvedSiteId = null
      if (rawSite) {
        const foundSite = siteMap.get(rawSite)
        if (foundSite) {
          resolvedSiteId = foundSite.id
        } else {
          errors.push(`Site "${rawSite}" was not found.`)
        }
      }

      return {
        rowNumber: index + 1,
        firstName,
        lastName,
        userName,
        email,
        password: rawPassword || null,
        contactNumber: contactNumber || null,
        departmentId: resolvedDeptId,
        departmentName: rawDept,
        roleId: resolvedRoleId,
        roleName: rawRole,
        positionId: resolvedPosId,
        positionName: rawPos,
        siteId: resolvedSiteId,
        siteName: rawSite,
        isValid: errors.length === 0,
        errors
      }
    })
  }, [rawRows, lookupMaps, isActorAdmin])

  const validRows = useMemo(() => evaluatedRows.filter((r) => r.isValid), [evaluatedRows])
  const invalidRowsCount = evaluatedRows.length - validRows.length

  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (validRows.length === 0) {
      setValidationError('No valid user accounts to import. Please review the errors in the preview below.')
      return
    }

    setValidationError('')
    const payload = validRows.map((r) => ({
      firstName: r.firstName,
      lastName: r.lastName,
      userName: r.userName,
      email: r.email,
      password: r.password,
      contactNumber: r.contactNumber,
      departmentId: r.departmentId,
      roleId: r.roleId,
      positionId: r.positionId,
      siteId: r.siteId
    }))

    const result = await onSubmit(payload)
    if (result) {
      setImportResult(result)
    }
  }

  const handleCopyCredentials = (user, index) => {
    const text = `Email: ${user.email}\nUsername: ${user.userName}\nPassword: ${user.temporaryPassword || user.password || '(as set)'}`
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleModalClose = () => {
    setCsvFileName('')
    setRawRows([])
    setValidationError('')
    setImportResult(null)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={handleModalClose}>
      <SubmissionLoadingOverlay isOpen={loading} message="Importing and creating user accounts..." />
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-users-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="#1A435A" />
            <h2 id="bulk-users-title" className="modal-title" style={{ margin: 0 }}>
              Bulk Import Users
            </h2>
          </div>
          <button className="modal-close" type="button" onClick={handleModalClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        {importResult ? (
          // Import Results View
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ margin: '0 0 4px', color: '#1A435A', fontSize: '18px' }}>Import Completed</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                Successfully created <strong>{importResult.succeeded?.length || 0}</strong> user accounts.
                {importResult.failed?.length > 0 && ` (${importResult.failed.length} failed)`}
              </p>
            </div>

            {importResult.succeeded?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#1A435A' }}>Created Accounts & Initial Credentials:</h4>
                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Email</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Username</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Initial Password</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.succeeded.map((u, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{u.firstName} {u.lastName}</td>
                          <td style={{ padding: '8px 12px', color: '#475569' }}>{u.email}</td>
                          <td style={{ padding: '8px 12px', color: '#475569' }}>{u.userName}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#0284c7' }}>
                            {u.temporaryPassword || '(as entered)'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(u, idx)}
                              style={{
                                background: 'none',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: copiedIndex === idx ? '#16a34a' : '#475569'
                              }}
                            >
                              {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                              {copiedIndex === idx ? 'Copied' : 'Copy'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResult.failed?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#b91c1c' }}>Failed Rows:</h4>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #fca5a5', borderRadius: '6px', background: '#fef2f2' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      {importResult.failed.map((f, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #fee2e2' }}>
                          <td style={{ padding: '6px 12px', fontWeight: 600, color: '#991b1b', width: '80px' }}>Row {f.row}</td>
                          <td style={{ padding: '6px 12px', color: '#475569' }}>{f.email || f.userName}</td>
                          <td style={{ padding: '6px 12px', color: '#dc2626' }}>{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-gradient-primary"
                onClick={handleModalClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          // File Upload & Preview Form
          <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {validationError && (
                <div className="user-info-error" style={{ marginBottom: '14px' }}>
                  {validationError}
                </div>
              )}

              {/* Instructions banner */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Info size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13px', color: '#0369a1', lineHeight: '1.4' }}>
                    <strong>CSV Requirements:</strong> Headers must include <code>first_name,last_name,user_name,email,password,role,department,position,site,contact_number</code>.
                    All emails must end with <code>@gmail.com</code>. Department is required. If password is blank, a temporary password is automatically generated.
                  </div>
                </div>
              </div>

              {/* Upload area & template download */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="small-label">Upload User CSV:</span>
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
                    <Download size={14} /> Download Sample Template
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
                  onClick={() => document.getElementById('user-csv-input')?.click()}
                >
                  <input
                    id="user-csv-input"
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
                    Accepts department and role names or numeric IDs
                  </span>
                </div>
              </div>

              {/* Preview Table */}
              {evaluatedRows.length > 0 && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A435A' }}>
                      Row Validation Preview ({evaluatedRows.length} rows)
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                        {validRows.length} Ready
                      </span>
                      {invalidRowsCount > 0 && (
                        <span style={{ color: '#b91c1c', fontWeight: 600, background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                          {invalidRowsCount} Invalid (will be skipped)
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Row</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Name</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Username</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Email</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Department</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Status / Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluatedRows.map((r) => {
                          const bgColor = r.isValid ? 'transparent' : '#fef2f2'
                          return (
                            <tr key={r.rowNumber} style={{ background: bgColor, borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 10px', color: '#64748b' }}>{r.rowNumber}</td>
                              <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1A435A' }}>
                                {r.firstName} {r.lastName}
                              </td>
                              <td style={{ padding: '6px 10px', color: '#475569' }}>{r.userName}</td>
                              <td style={{ padding: '6px 10px', color: '#475569' }}>{r.email}</td>
                              <td style={{ padding: '6px 10px', color: '#475569' }}>
                                {r.departmentName || <span style={{ color: '#ef4444' }}>Missing</span>}
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                {r.isValid ? (
                                  <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                    <CheckCircle2 size={13} /> Ready
                                  </span>
                                ) : (
                                  <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                    <AlertCircle size={13} /> {r.errors.join('; ')}
                                  </span>
                                )}
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
                onClick={handleModalClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-gradient-primary"
                type="submit"
                disabled={loading || validRows.length === 0}
              >
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <LoaderCircle size={16} className="iso-spinner" /> Importing...
                  </span>
                ) : (
                  `Import ${validRows.length} User${validRows.length === 1 ? '' : 's'}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
