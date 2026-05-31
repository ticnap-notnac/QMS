import { hasServiceRole, supabase } from '../lib/supabase.js'
import { getRequestActor } from '../lib/requestUtils.js'
import { writeAudit } from '../lib/audit.js'
import { assignReportToEmployee } from '../services/ncrAssignmentService.js'

function normalizeId(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isNaN(numeric) ? value : numeric
}

function buildReferenceNumber(referenceNo) {
  const match = String(referenceNo || '').match(/^NCR-(\d{4})-(\d{4})$/i)
  if (!match) {
    return 0
  }

  return Number(match[2]) || 0
}

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeSeverityValue(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'critical') return 'CRITICAL'
  if (normalized === 'high') return 'HIGH'
  if (normalized === 'medium') return 'MEDIUM'
  if (normalized === 'low') return 'LOW'
  return normalizeText(value)
}

function extractEvidenceStoragePath(rawUrl) {
  const value = String(rawUrl || '').trim()
  if (!value) return null

  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, '')
  }

  const match = value.match(/\/storage\/v1\/object\/public\/ncr-evidence\/(.+)$/i)
  if (!match || !match[1]) return null
  return decodeURIComponent(match[1])
}

async function buildEvidenceDisplayUrl(rawUrl) {
  const path = extractEvidenceStoragePath(rawUrl)
  if (!path) return rawUrl || null

  const { data, error } = await supabase.storage.from('ncr-evidence').createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) {
    return rawUrl || null
  }

  return data.signedUrl
}

function normalizeVerificationDate(value) {
  const text = normalizeText(value)
  if (!text) return null

  const isoMatch = text.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) return text

  const displayMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (displayMatch) {
    const [, day, month, year] = displayMatch
    return `${year}-${month}-${day}`
  }

  return text
}

function parseResolutionTime(resolutionTimeValue, resolutionTimeUnit) {
  const numericValue = Number(resolutionTimeValue)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  const normalizedUnit = String(resolutionTimeUnit || '').trim().toLowerCase()
  if (!['hour', 'hours', 'day', 'days'].includes(normalizedUnit)) {
    return null
  }

  const unit = normalizedUnit.startsWith('day') ? 'days' : 'hours'
  return `${numericValue} ${unit}`
}

async function createNotification({ title, message, type = 'info', reportId = null, userId = null }) {
  const { error } = await supabase
    .from('notifications')
    .insert([{ user_id: userId, title, message, type, is_read: false, report_id: reportId }])

  if (error) {
    throw error
  }
}

async function buildEnrichedReports(reports) {
  const reportList = Array.isArray(reports) ? reports : []

  if (reportList.length === 0) {
    return []
  }

  const { userById, roleById, departmentById } = await getReporterMaps(reportList)

  const locationIds = [...new Set(reportList.map((report) => report.location_id).filter(Boolean))]
  const productTypeIds = [...new Set(reportList.map((report) => report.product_type_id).filter(Boolean))]

  const [locationsResult, productTypesResult] = await Promise.all([
    locationIds.length > 0
      ? supabase.from('locations').select('id, location_name').in('id', locationIds)
      : Promise.resolve({ data: [], error: null }),
    productTypeIds.length > 0
      ? supabase.from('product_types').select('id, product_name').in('id', productTypeIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (locationsResult.error) {
    throw locationsResult.error
  }

  if (productTypesResult.error) {
    throw productTypesResult.error
  }

  const locationById = new Map((locationsResult.data || []).map((location) => [String(location.id), location.location_name]))
  const productTypeById = new Map((productTypesResult.data || []).map((productType) => [String(productType.id), productType.product_name]))

  const enriched = reportList.map((report) => {
    const reporter = userById.get(report.reported_by)
    const reporterFullName = reporter
      ? `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() || reporter.user_name || null
      : null

    return {
      ...report,
      reporter_full_name: reporterFullName,
      reporter_role_name: reporter ? roleById.get(String(reporter.role_id)) || null : null,
      reporter_department_name: reporter ? departmentById.get(String(reporter.department_id)) || null : null,
      location_name: report.location_id ? locationById.get(String(report.location_id)) || null : report.complaint_location || null,
      product_type_name: report.product_type_id ? productTypeById.get(String(report.product_type_id)) || null : report.product_type || null,
    }
  })

  return await Promise.all(enriched.map(async (report) => ({
    ...report,
    evidence_url: await buildEvidenceDisplayUrl(report.evidence_url),
    investigation_evidence_url: await buildEvidenceDisplayUrl(report.investigation_evidence_url),
  })))
}

async function resolveCatalogEntry({ table, idColumn, nameColumn, rawId, rawName }) {
  const numericId = normalizeId(rawId)
  if (numericId !== null && numericId !== undefined && numericId !== '') {
    const { data, error } = await supabase
      .from(table)
      .select(`${idColumn}, ${nameColumn}`)
      .eq(idColumn, numericId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return { id: data[idColumn], name: data[nameColumn] || null }
    }
  }

  const textValue = normalizeText(rawName || rawId)
  if (!textValue) {
    return { id: null, name: null }
  }

  const { data: existing, error: lookupError } = await supabase
    .from(table)
    .select(`${idColumn}, ${nameColumn}`)
    .ilike(nameColumn, textValue)
    .maybeSingle()

  if (lookupError) {
    throw lookupError
  }

  if (existing) {
    return { id: existing[idColumn], name: existing[nameColumn] || textValue }
  }

  const { data: inserted, error: insertError } = await supabase
    .from(table)
    .insert([{ [nameColumn]: textValue }])
    .select(`${idColumn}, ${nameColumn}`)
    .maybeSingle()

  if (insertError) {
    throw insertError
  }

  return { id: inserted?.[idColumn] ?? null, name: inserted?.[nameColumn] || textValue }
}

async function getReporterMaps(reports) {
  // `reported_by` stores the internal users.id (integer). Query users by id.
  const reporterIds = [...new Set(reports.map((report) => report.reported_by).filter(Boolean))]

  if (reporterIds.length === 0) {
    return {
      userById: new Map(),
      roleById: new Map(),
      departmentById: new Map(),
    }
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, auth_id, role_id, department_id')
    .in('id', reporterIds)

  if (usersError) {
    throw usersError
  }

  const roleIds = [...new Set((users || []).map((user) => user.role_id).filter(Boolean))]
  const departmentIds = [...new Set((users || []).map((user) => user.department_id).filter(Boolean))]

  const [rolesResult, departmentsResult] = await Promise.all([
    roleIds.length > 0
      ? supabase.from('roles').select('id, role_name').in('id', roleIds)
      : Promise.resolve({ data: [], error: null }),
    departmentIds.length > 0
      ? supabase.from('departments').select('id, department_name').in('id', departmentIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (rolesResult.error) {
    throw rolesResult.error
  }

  if (departmentsResult.error) {
    throw departmentsResult.error
  }

  return {
    userById: new Map((users || []).map((user) => [user.id, user])),
    roleById: new Map((rolesResult.data || []).map((role) => [String(role.id), role.role_name])),
    departmentById: new Map((departmentsResult.data || []).map((department) => [String(department.id), department.department_name])),
  }
}

export async function getReports(_req, res) {
  const scope = String(_req.query?.scope || 'open').trim().toLowerCase()

  let query = supabase
    .from('ncr_reports')
    .select('*')

  if (scope === 'investigated') {
    query = query.not('investigation_details', 'is', null)
  } else if (scope === 'all') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.is('investigation_details', null)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    return res.json(await buildEnrichedReports(data || []))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export async function createReport(req, res) {
  const {
    product_type,
    product_type_id,
    batch_number,
    complaint_location,
    location_id,
    severity,
    department_id,
    description,
    evidence_url = null,
    occurrence_date = (new Date().toISOString().slice(0, 10)),
  } = req.body || {}

  const reportedByAuthId = getRequestActor(req)

  if (!reportedByAuthId) {
    return res.status(400).json({ error: 'Missing x-user-auth-id header.' })
  }

  if (!batch_number || !severity || !department_id || !description) {
    return res.status(400).json({ error: 'Batch number, severity, department, and description are required.' })
  }

  const { data: reporter, error: reporterError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()

  if (reporterError) {
    return res.status(500).json({ error: reporterError.message })
  }

  if (!reporter) {
    return res.status(404).json({ error: 'Reporter profile not found.' })
  }

  const year = new Date().getFullYear()
  const { data: latest, error: latestError } = await supabase
    .from('ncr_reports')
    .select('reference_no')
    .ilike('reference_no', `NCR-${year}-%`)
    .order('reference_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return res.status(500).json({ error: latestError.message })
  }

  const nextSequence = buildReferenceNumber(latest?.reference_no) + 1
  const referenceNo = `NCR-${year}-${String(nextSequence).padStart(4, '0')}`

  const { id: resolvedLocationId, name: resolvedLocationName } = await resolveCatalogEntry({
    table: 'locations',
    idColumn: 'id',
    nameColumn: 'location_name',
    rawId: location_id,
    rawName: complaint_location,
  })

  const { id: resolvedProductTypeId, name: resolvedProductTypeName } = await resolveCatalogEntry({
    table: 'product_types',
    idColumn: 'id',
    nameColumn: 'product_name',
    rawId: product_type_id,
    rawName: product_type,
  })

  if (!resolvedLocationId || !resolvedProductTypeId) {
    return res.status(400).json({ error: 'Location and product type are required.' })
  }

  const payload = {
    reference_no: referenceNo,
    reported_by: reporter.id,
    status: 'OPEN',
    issue_type: 'ncr',
    occurrence_date: occurrence_date || new Date().toISOString().slice(0, 10),
    product_type: resolvedProductTypeName,
    product_type_id: resolvedProductTypeId,
    batch_number,
    complaint_location: resolvedLocationName,
    location_id: resolvedLocationId,
    severity: normalizeSeverityValue(severity),
    department_id: normalizeId(department_id),
    description,
    // Optional CAR/QDDR flags removed to avoid schema mismatch on some installs
    evidence_url,
  }

  const { data, error } = await supabase
    .from('ncr_reports')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_create',
      userAuthId: reportedByAuthId,
      details: { id: data?.id ?? null, reference_no: referenceNo },
    })
  } catch (auditError) {
    console.warn('Failed to record NCR create audit:', auditError?.message || auditError)
  }

  return res.status(201).json(data)
}

export async function updateReport(req, res) {
  const { id } = req.params
  const {
    product_type,
    product_type_id,
    batch_number,
    complaint_location,
    location_id,
    severity,
    department_id,
    description,
    evidence_url,
    status,
  } = req.body || {}

  const { data: existing, error: existingError } = await supabase
    .from('ncr_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (existingError) {
    return res.status(500).json({ error: existingError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'NCR report not found.' })
  }

  let resolvedLocation = null
  if (location_id !== undefined || complaint_location !== undefined) {
    resolvedLocation = await resolveCatalogEntry({
      table: 'locations',
      idColumn: 'id',
      nameColumn: 'location_name',
      rawId: location_id,
      rawName: complaint_location,
    })
  }

  let resolvedProductType = null
  if (product_type_id !== undefined || product_type !== undefined) {
    resolvedProductType = await resolveCatalogEntry({
      table: 'product_types',
      idColumn: 'id',
      nameColumn: 'product_name',
      rawId: product_type_id,
      rawName: product_type,
    })
  }

  const updates = {}
  if (resolvedProductType) {
    updates.product_type = resolvedProductType.name
    updates.product_type_id = resolvedProductType.id
  }
  if (batch_number !== undefined) updates.batch_number = batch_number
  if (resolvedLocation) {
    updates.complaint_location = resolvedLocation.name
    updates.location_id = resolvedLocation.id
  }
  if (severity !== undefined) updates.severity = normalizeSeverityValue(severity)
  if (department_id !== undefined) updates.department_id = normalizeId(department_id)
  if (description !== undefined) updates.description = description
  if (car_filed !== undefined) updates.car_filed = Boolean(car_filed)
  if (qddr_filed !== undefined) updates.qddr_filed = Boolean(qddr_filed)
  if (evidence_url !== undefined) updates.evidence_url = evidence_url
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('ncr_reports')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_update',
      userAuthId: getRequestActor(req),
      details: { id, updates },
    })
  } catch (auditError) {
    console.warn('Failed to record NCR update audit:', auditError?.message || auditError)
  }

  return res.json(data)
}

export async function updateReportInvestigation(req, res) {
  const { id } = req.params
  const {
    investigation_details,
    resolution_details,
    resolution_time_value,
    resolution_time_unit,
    verification_date,
  } = req.body || {}

  const { data: existing, error: existingError } = await supabase
    .from('ncr_reports')
    .select('id, reference_no, investigation_evidence_url')
    .eq('id', id)
    .maybeSingle()

  if (existingError) {
    return res.status(500).json({ error: existingError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'NCR report not found.' })
  }

  let investigationEvidenceUrl = existing.investigation_evidence_url || null

  if (req.file && req.file.buffer) {
    const orig = req.file.originalname || `${existing.reference_no}-investigation`
    const ext = (orig.match(/\.([0-9a-zA-Z]+)$/) || [])[1] || ''
    const filename = `investigation/${existing.reference_no}-investigation${ext ? `.${ext}` : ''}`

    const uploadResult = await supabase.storage.from('ncr-evidence').upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    })

    if (uploadResult.error) {
      return res.status(500).json({ error: uploadResult.error.message || 'Failed to upload investigation evidence.' })
    }

    const { data: publicData } = await supabase.storage.from('ncr-evidence').getPublicUrl(filename)
    investigationEvidenceUrl = publicData?.publicUrl || null
  }

  const updates = {
    investigation_details: normalizeText(investigation_details) || null,
    resolution_details: normalizeText(resolution_details) || null,
    resolution_time: parseResolutionTime(resolution_time_value, resolution_time_unit),
    verification_date: normalizeVerificationDate(verification_date),
    investigation_evidence_url: investigationEvidenceUrl,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ncr_reports')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_investigation_update',
      userAuthId: getRequestActor(req),
      details: { id, updates },
    })
  } catch (auditError) {
    console.warn('Failed to record NCR investigation update audit:', auditError?.message || auditError)
  }

  try {
    await createNotification({
      title: `NCR Updated: ${existing.reference_no}`,
      message: `Report ${existing.reference_no} now has updated investigation details and resolution data.`,
      type: 'info',
      reportId: existing.id,
    })
  } catch (notificationError) {
    console.warn('Failed to create NCR update notification:', notificationError?.message || notificationError)
  }

  return res.json(data)
}

export async function assignReport(req, res) {
  const { id } = req.params
  const { assignedToId } = req.body || {}

  try {
    const result = await assignReportToEmployee({
      reportId: id,
      assignedToId,
      currentUserAuthId: getRequestActor(req),
    })

    return res.json({ success: true, data: result.report, assignedTo: result.assignedTo })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to assign report.' })
  }
}

export async function deleteReport(req, res) {
  const { id } = req.params

  const { data: existing, error: existingError } = await supabase
    .from('ncr_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (existingError) {
    return res.status(500).json({ error: existingError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'NCR report not found.' })
  }

  const { error } = await supabase
    .from('ncr_reports')
    .delete()
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_delete',
      userAuthId: getRequestActor(req),
      details: { id, reference_no: existing.reference_no || null },
    })
  } catch (auditError) {
    console.warn('Failed to record NCR delete audit:', auditError?.message || auditError)
  }

  return res.json({ success: true })
}

export async function createReportSubmit(req, res) {
  // multer stores file in memory (buffer)
  const reportedByAuthId = getRequestActor(req)

  if (!reportedByAuthId) {
    return res.status(400).json({ error: 'Missing x-user-auth-id header.' })
  }

  const {
    product_type,
    product_type_id,
    batch_number,
    location,
    location_id,
    severity,
    department_id,
    description,
    occurrence_date = (new Date().toISOString().slice(0, 10)),
  } = req.body || {}

  if (!batch_number || !severity || !department_id || !description) {
    return res.status(400).json({ error: 'Batch number, severity, department, and description are required.' })
  }

  const { data: reporter, error: reporterError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()

  if (reporterError) {
    return res.status(500).json({ error: reporterError.message })
  }

  if (!reporter) {
    return res.status(404).json({ error: 'Reporter profile not found.' })
  }

  const year = new Date().getFullYear()
  const { data: latest, error: latestError } = await supabase
    .from('ncr_reports')
    .select('reference_no')
    .ilike('reference_no', `NCR-${year}-%`)
    .order('reference_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return res.status(500).json({ error: latestError.message })
  }

  const nextSequence = buildReferenceNumber(latest?.reference_no) + 1
  const referenceNo = `NCR-${year}-${String(nextSequence).padStart(4, '0')}`

  const { id: resolvedLocationId, name: resolvedLocationName } = await resolveCatalogEntry({
    table: 'locations',
    idColumn: 'id',
    nameColumn: 'location_name',
    rawId: location_id,
    rawName: location,
  })

  const { id: resolvedProductTypeId, name: resolvedProductTypeName } = await resolveCatalogEntry({
    table: 'product_types',
    idColumn: 'id',
    nameColumn: 'product_name',
    rawId: product_type_id,
    rawName: product_type,
  })

  if (!resolvedLocationId || !resolvedProductTypeId) {
    return res.status(400).json({ error: 'Location and product type are required.' })
  }

  let evidenceUrl = null
  try {
    if (req.file && req.file.buffer) {
      if (!hasServiceRole) {
        return res.status(500).json({ error: 'Service role key is required for uploads.' })
      }

      const orig = req.file.originalname || `${referenceNo}`
      const ext = (orig.match(/\.([0-9a-zA-Z]+)$/) || [])[1] || ''

      // Attempt upload; if conflict occurs, retry with a randomized filename
      let filename = `initial/${referenceNo}-${Date.now()}-evidence${ext ? `.${ext}` : ''}`
      let uploadData = null
      let uploadError = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        const resUpload = await supabase.storage.from('ncr-evidence').upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
        uploadData = resUpload.data
        uploadError = resUpload.error
        if (!uploadError) break
        console.warn('Upload error', { message: uploadError.message, statusCode: uploadError.statusCode || uploadError.status })
        if ((uploadError.statusCode || uploadError.status) === 409) {
          // conflict: try a different filename and retry
          filename = `initial/${referenceNo}-${Date.now()}-${Math.floor(Math.random() * 100000)}-evidence${ext ? `.${ext}` : ''}`
          continue
        }
        break
      }

      if (uploadError) {
        return res.status(500).json({ error: uploadError.message || 'Failed to upload evidence' })
      }

      const { data: publicData } = await supabase.storage.from('ncr-evidence').getPublicUrl(filename)
      evidenceUrl = publicData?.publicUrl || null
    }
  } catch (err) {
    console.warn('Failed to upload evidence', err)
    return res.status(500).json({ error: err.message || 'Failed to upload evidence' })
  }

  const payload = {
    reference_no: referenceNo,
    reported_by: reporter.id,
    status: 'OPEN',
    issue_type: 'ncr',
    occurrence_date: occurrence_date || new Date().toISOString().slice(0, 10),
    product_type: resolvedProductTypeName,
    product_type_id: resolvedProductTypeId,
    batch_number,
    complaint_location: resolvedLocationName,
    location_id: resolvedLocationId,
    severity: normalizeSeverityValue(severity),
    department_id: normalizeId(department_id),
    description,
    evidence_url: evidenceUrl,
  }

  const { data, error } = await supabase
    .from('ncr_reports')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_create',
      userAuthId: reportedByAuthId,
      details: { id: data?.id ?? null, reference_no: referenceNo },
    })
  } catch (auditError) {
    console.warn('Failed to record NCR create audit:', auditError?.message || auditError)
  }

  try {
    await createNotification({
      title: `New NCR Submitted: ${referenceNo}`,
      message: `Report ${referenceNo} has been submitted and is ready for review.`,
      type: 'info',
      reportId: data?.id ?? null,
    })
  } catch (notificationError) {
    console.warn('Failed to create NCR submission notification:', notificationError?.message || notificationError)
  }

  return res.status(201).json({ success: true, data })
}