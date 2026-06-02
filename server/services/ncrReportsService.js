// src/services/ncrReportsService.js
// feat(ncr): extract NCR business logic into ncrReportsService

import { supabase, hasServiceRole } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

// ─── Pure Utilities ──────────────────────────────────────────────────────────

export function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isNaN(numeric) ? value : numeric
}

export function buildReferenceNumber(referenceNo) {
  const match = String(referenceNo || '').match(/^NCR-(\d{4})-(\d{4})$/i)
  if (!match) return 0
  return Number(match[2]) || 0
}

export function normalizeText(value) {
  return String(value || '').trim()
}

export function normalizeSeverityValue(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'critical') return 'CRITICAL'
  if (normalized === 'high') return 'HIGH'
  if (normalized === 'medium') return 'MEDIUM'
  if (normalized === 'low') return 'LOW'
  return normalizeText(value)
}

export function extractEvidenceStoragePath(rawUrl) {
  const value = String(rawUrl || '').trim()
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, '')
  const match = value.match(/\/storage\/v1\/object\/public\/ncr-evidence\/(.+)$/i)
  if (!match || !match[1]) return null
  return decodeURIComponent(match[1])
}

export function normalizeVerificationDate(value) {
  const text = normalizeText(value)
  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const displayMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (displayMatch) {
    const [, day, month, year] = displayMatch
    return `${year}-${month}-${day}`
  }
  return text
}

export function parseResolutionTime(resolutionTimeValue, resolutionTimeUnit) {
  const numericValue = Number(resolutionTimeValue)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null
  const normalizedUnit = String(resolutionTimeUnit || '').trim().toLowerCase()
  if (!['hour', 'hours', 'day', 'days'].includes(normalizedUnit)) return null
  const unit = normalizedUnit.startsWith('day') ? 'days' : 'hours'
  return `${numericValue} ${unit}`
}

export function isAdminOrAuditor(roleName) {
  const normalized = String(roleName || '').trim().toLowerCase()
  return normalized === 'admin' || normalized === 'auditor'
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

export async function buildEvidenceDisplayUrl(rawUrl) {
  const path = extractEvidenceStoragePath(rawUrl)
  if (!path) return rawUrl || null
  const { data, error } = await supabase.storage.from('ncr-evidence').createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return rawUrl || null
  return data.signedUrl
}

export async function createNotification({ title, message, type = 'info', reportId = null, userId = null }) {
  if (!userId) return
  const { error } = await supabase
    .from('notifications')
    .insert([{ user_id: userId, title, message, type, is_read: false, report_id: reportId }])
  if (error) throw error
}

export async function getUsersByRoleNames(roleNames = []) {
  const normalizedRoleNames = [
    ...new Set(
      (roleNames || []).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean)
    ),
  ]
  if (normalizedRoleNames.length === 0) return []

  const { data: roles, error: rolesError } = await supabase.from('roles').select('id, role_name')
  if (rolesError) throw rolesError

  const targetRoleIds = (roles || [])
    .filter((role) => normalizedRoleNames.includes(String(role.role_name || '').trim().toLowerCase()))
    .map((role) => role.id)

  if (targetRoleIds.length === 0) return []

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, user_name, first_name, last_name, auth_id, role_id')
    .in('role_id', targetRoleIds)
  if (usersError) throw usersError

  return users || []
}

export async function createNotificationsForRoles({ roleNames = [], title, message, type = 'info', reportId = null }) {
  const users = await getUsersByRoleNames(roleNames)
  if (users.length === 0) return 0

  const rows = users.map((user) => ({
    user_id: user.id,
    title,
    message,
    type,
    report_id: reportId,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) throw error

  return rows.length
}

export async function getCurrentUser(authId) {
  if (!authId) throw new Error('Missing x-user-auth-id header.')

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, auth_id, role_id, user_name, first_name, last_name')
    .eq('auth_id', authId)
    .maybeSingle()
  if (error) throw error
  if (!profile) throw new Error('Current user profile not found.')

  let roleName = null
  if (profile.role_id) {
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', profile.role_id)
      .maybeSingle()
    if (roleError) throw roleError
    roleName = roleData?.role_name || null
  }

  return { ...profile, role_name: roleName }
}

export async function getReporterMaps(reports) {
  const reporterIds = [...new Set(reports.map((r) => r.reported_by).filter(Boolean))]
  if (reporterIds.length === 0) {
    return { userById: new Map(), roleById: new Map(), departmentById: new Map() }
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, auth_id, role_id, department_id')
    .in('id', reporterIds)
  if (usersError) throw usersError

  const roleIds = [...new Set((users || []).map((u) => u.role_id).filter(Boolean))]
  const departmentIds = [...new Set((users || []).map((u) => u.department_id).filter(Boolean))]

  const [rolesResult, departmentsResult] = await Promise.all([
    roleIds.length > 0
      ? supabase.from('roles').select('id, role_name').in('id', roleIds)
      : Promise.resolve({ data: [], error: null }),
    departmentIds.length > 0
      ? supabase.from('departments').select('id, department_name').in('id', departmentIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (rolesResult.error) throw rolesResult.error
  if (departmentsResult.error) throw departmentsResult.error

  return {
    userById: new Map((users || []).map((u) => [u.id, u])),
    roleById: new Map((rolesResult.data || []).map((r) => [String(r.id), r.role_name])),
    departmentById: new Map((departmentsResult.data || []).map((d) => [String(d.id), d.department_name])),
  }
}

export async function buildEnrichedReports(reports) {
  const reportList = Array.isArray(reports) ? reports : []
  if (reportList.length === 0) return []

  const { userById, roleById, departmentById } = await getReporterMaps(reportList)

  const locationIds = [...new Set(reportList.map((r) => r.location_id).filter(Boolean))]
  const productTypeIds = [...new Set(reportList.map((r) => r.product_type_id).filter(Boolean))]

  const [locationsResult, productTypesResult] = await Promise.all([
    locationIds.length > 0
      ? supabase.from('locations').select('id, location_name').in('id', locationIds)
      : Promise.resolve({ data: [], error: null }),
    productTypeIds.length > 0
      ? supabase.from('product_types').select('id, product_name').in('id', productTypeIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (locationsResult.error) throw locationsResult.error
  if (productTypesResult.error) throw productTypesResult.error

  const locationById = new Map((locationsResult.data || []).map((l) => [String(l.id), l.location_name]))
  const productTypeById = new Map((productTypesResult.data || []).map((p) => [String(p.id), p.product_name]))

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
      location_name: report.location_id
        ? locationById.get(String(report.location_id)) || null
        : report.complaint_location || null,
      product_type_name: report.product_type_id
        ? productTypeById.get(String(report.product_type_id)) || null
        : report.product_type || null,
    }
  })

  return Promise.all(
    enriched.map(async (report) => ({
      ...report,
      evidence_url: await buildEvidenceDisplayUrl(report.evidence_url),
      investigation_evidence_url: await buildEvidenceDisplayUrl(report.investigation_evidence_url),
    }))
  )
}

export async function resolveCatalogEntry({ table, idColumn, nameColumn, rawId, rawName }) {
  const numericId = normalizeId(rawId)
  if (numericId !== null && numericId !== undefined && numericId !== '') {
    const { data, error } = await supabase
      .from(table)
      .select(`${idColumn}, ${nameColumn}`)
      .eq(idColumn, numericId)
      .maybeSingle()
    if (error) throw error
    if (data) return { id: data[idColumn], name: data[nameColumn] || null }
  }

  const textValue = normalizeText(rawName || rawId)
  if (!textValue) return { id: null, name: null }

  const { data: existing, error: lookupError } = await supabase
    .from(table)
    .select(`${idColumn}, ${nameColumn}`)
    .ilike(nameColumn, textValue)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) return { id: existing[idColumn], name: existing[nameColumn] || textValue }

  const { data: inserted, error: insertError } = await supabase
    .from(table)
    .insert([{ [nameColumn]: textValue }])
    .select(`${idColumn}, ${nameColumn}`)
    .maybeSingle()
  if (insertError) throw insertError

  return { id: inserted?.[idColumn] ?? null, name: inserted?.[nameColumn] || textValue }
}

// ─── Core NCR Business Operations ────────────────────────────────────────────

/**
 * Fetches NCR reports filtered by scope and enriches them with related data.
 * @param {'open'|'investigated'|'all'} scope
 */
export async function fetchReports(scope = 'open') {
  let query = supabase.from('ncr_reports').select('*')

  if (scope === 'investigated') {
    query = query.not('investigation_details', 'is', null).not('status', 'ilike', 'closed')
  } else if (scope === 'closed') {
    query = query.ilike('status', 'closed')
  } else if (scope !== 'all') {
    query = query.is('investigation_details', null)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error

  return buildEnrichedReports(data || [])
}

/**
 * Creates a new NCR report (no file upload). Used by createReport controller action.
 */
export async function createNcrReport({ body, reportedByAuthId }) {
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
    occurrence_date = new Date().toISOString().slice(0, 10),
  } = body

  const { data: reporter, error: reporterError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()
  if (reporterError) throw reporterError
  if (!reporter) throw Object.assign(new Error('Reporter profile not found.'), { status: 404 })

  const year = new Date().getFullYear()
  const { data: latest, error: latestError } = await supabase
    .from('ncr_reports')
    .select('reference_no')
    .ilike('reference_no', `NCR-${year}-%`)
    .order('reference_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) throw latestError

  const referenceNo = `NCR-${year}-${String(buildReferenceNumber(latest?.reference_no) + 1).padStart(4, '0')}`

  const { id: resolvedLocationId, name: resolvedLocationName } = await resolveCatalogEntry({
    table: 'locations', idColumn: 'id', nameColumn: 'location_name',
    rawId: location_id, rawName: complaint_location,
  })
  const { id: resolvedProductTypeId, name: resolvedProductTypeName } = await resolveCatalogEntry({
    table: 'product_types', idColumn: 'id', nameColumn: 'product_name',
    rawId: product_type_id, rawName: product_type,
  })

  if (!resolvedLocationId || !resolvedProductTypeId) {
    throw Object.assign(new Error('Location and product type are required.'), { status: 400 })
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
    evidence_url,
  }

  const { data, error } = await supabase.from('ncr_reports').insert(payload).select('*').maybeSingle()
  if (error) throw error

  return { data, referenceNo }
}

/**
 * Creates a new NCR report with file upload (multipart). Used by createReportSubmit controller action.
 */
export async function createNcrReportWithUpload({ body, file, reportedByAuthId }) {
  const {
    product_type,
    product_type_id,
    batch_number,
    location,
    location_id,
    severity,
    department_id,
    description,
    occurrence_date = new Date().toISOString().slice(0, 10),
  } = body

  const { data: reporter, error: reporterError } = await supabase
    .from('users')
    .select('id, user_name, first_name, last_name')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()
  if (reporterError) throw reporterError
  if (!reporter) throw Object.assign(new Error('Reporter profile not found.'), { status: 404 })

  const year = new Date().getFullYear()
  const { data: latest, error: latestError } = await supabase
    .from('ncr_reports')
    .select('reference_no')
    .ilike('reference_no', `NCR-${year}-%`)
    .order('reference_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) throw latestError

  const referenceNo = `NCR-${year}-${String(buildReferenceNumber(latest?.reference_no) + 1).padStart(4, '0')}`

  const { id: resolvedLocationId, name: resolvedLocationName } = await resolveCatalogEntry({
    table: 'locations', idColumn: 'id', nameColumn: 'location_name',
    rawId: location_id, rawName: location,
  })
  const { id: resolvedProductTypeId, name: resolvedProductTypeName } = await resolveCatalogEntry({
    table: 'product_types', idColumn: 'id', nameColumn: 'product_name',
    rawId: product_type_id, rawName: product_type,
  })

  if (!resolvedLocationId || !resolvedProductTypeId) {
    throw Object.assign(new Error('Location and product type are required.'), { status: 400 })
  }

  let evidenceUrl = null
  if (file && file.buffer) {
    if (!hasServiceRole) {
      throw Object.assign(new Error('Service role key is required for uploads.'), { status: 500 })
    }
    const orig = file.originalname || `${referenceNo}`
    const ext = (orig.match(/\.([0-9a-zA-Z]+)$/) || [])[1] || ''
    let filename = `initial/${referenceNo}-${Date.now()}-evidence${ext ? `.${ext}` : ''}`

    let uploadData = null
    let uploadError = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      const resUpload = await supabase.storage
        .from('ncr-evidence')
        .upload(filename, file.buffer, { contentType: file.mimetype, upsert: true })
      uploadData = resUpload.data
      uploadError = resUpload.error
      if (!uploadError) break
      if ((uploadError.statusCode || uploadError.status) === 409) {
        filename = `initial/${referenceNo}-${Date.now()}-${Math.floor(Math.random() * 100000)}-evidence${ext ? `.${ext}` : ''}`
        continue
      }
      break
    }
    if (uploadError) throw new Error(uploadError.message || 'Failed to upload evidence')

    const { data: publicData } = await supabase.storage.from('ncr-evidence').getPublicUrl(filename)
    evidenceUrl = publicData?.publicUrl || null
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

  const { data, error } = await supabase.from('ncr_reports').insert(payload).select('*').maybeSingle()
  if (error) throw error

  return { data, referenceNo, reporter }
}

/**
 * Applies a partial update to an NCR report record.
 */
export async function updateNcrReport({ id, body }) {
  const { data: existing, error: existingError } = await supabase
    .from('ncr_reports').select('*').eq('id', id).maybeSingle()
  if (existingError) throw existingError
  if (!existing) throw Object.assign(new Error('NCR report not found.'), { status: 404 })

  const {
    product_type, product_type_id, batch_number, complaint_location, location_id,
    severity, department_id, description, car_filed, qddr_filed, evidence_url, status,
  } = body

  let resolvedLocation = null
  if (location_id !== undefined || complaint_location !== undefined) {
    resolvedLocation = await resolveCatalogEntry({
      table: 'locations', idColumn: 'id', nameColumn: 'location_name',
      rawId: location_id, rawName: complaint_location,
    })
  }

  let resolvedProductType = null
  if (product_type_id !== undefined || product_type !== undefined) {
    resolvedProductType = await resolveCatalogEntry({
      table: 'product_types', idColumn: 'id', nameColumn: 'product_name',
      rawId: product_type_id, rawName: product_type,
    })
  }

  const updates = {}
  if (resolvedProductType) { updates.product_type = resolvedProductType.name; updates.product_type_id = resolvedProductType.id }
  if (batch_number !== undefined) updates.batch_number = batch_number
  if (resolvedLocation) { updates.complaint_location = resolvedLocation.name; updates.location_id = resolvedLocation.id }
  if (severity !== undefined) updates.severity = normalizeSeverityValue(severity)
  if (department_id !== undefined) updates.department_id = normalizeId(department_id)
  if (description !== undefined) updates.description = description
  if (car_filed !== undefined) updates.car_filed = Boolean(car_filed)
  if (qddr_filed !== undefined) updates.qddr_filed = Boolean(qddr_filed)
  if (evidence_url !== undefined) updates.evidence_url = evidence_url
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('ncr_reports').update(updates).eq('id', id).select('*').maybeSingle()
  if (error) throw error

  return data
}

/**
 * Submits investigation details for a report; handles optional evidence file upload.
 */
export async function updateNcrInvestigation({ id, body, file }) {
  const {
    investigation_details, resolution_details,
    resolution_time_value, resolution_time_unit, verification_date,
  } = body

  const { data: existing, error: existingError } = await supabase
    .from('ncr_reports')
    .select('id, reference_no, investigation_evidence_url')
    .eq('id', id)
    .maybeSingle()
  if (existingError) throw existingError
  if (!existing) throw Object.assign(new Error('NCR report not found.'), { status: 404 })

  let investigationEvidenceUrl = existing.investigation_evidence_url || null

  if (file && file.buffer) {
    const orig = file.originalname || `${existing.reference_no}-investigation`
    const ext = (orig.match(/\.([0-9a-zA-Z]+)$/) || [])[1] || ''
    const filename = `investigation/${existing.reference_no}-investigation${ext ? `.${ext}` : ''}`

    const { error: uploadError } = await supabase.storage
      .from('ncr-evidence')
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: true })
    if (uploadError) throw new Error(uploadError.message || 'Failed to upload investigation evidence.')

    const { data: publicData } = await supabase.storage.from('ncr-evidence').getPublicUrl(filename)
    investigationEvidenceUrl = publicData?.publicUrl || null
  }

  const updates = {
    investigation_details: normalizeText(investigation_details) || null,
    resolution_details: normalizeText(resolution_details) || null,
    resolution_time: parseResolutionTime(resolution_time_value, resolution_time_unit),
    verification_date: normalizeVerificationDate(verification_date),
    investigation_evidence_url: investigationEvidenceUrl,
    assigned_to: null,
    assigned_at: null,
    assigned_by: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ncr_reports').update(updates).eq('id', id).select('*').maybeSingle()
  if (error) throw error

  return { data, existing }
}

/**
 * Approves or rejects an NCR report after investigation review.
 */
export async function reviewNcrApproval({ id, decision, reason, currentUser }) {
  const { data: report, error: reportError } = await supabase
    .from('ncr_reports')
    .select('id, reference_no, reported_by, status')
    .eq('id', id)
    .maybeSingle()
  if (reportError) throw reportError
  if (!report) throw Object.assign(new Error('NCR report not found.'), { status: 404 })

  const nextStatus = decision === 'approve' ? 'CLOSED' : 'OPEN'
  const rejectionResetFields = decision === 'reject'
    ? {
        investigation_details: null,
        resolution_details: null,
        resolution_time: null,
        verification_date: null,
        investigation_evidence_url: null,
      }
    : {}

  const { data: updatedReport, error: updateError } = await supabase
    .from('ncr_reports')
    .update({ status: nextStatus, ...rejectionResetFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (updateError) throw updateError

  return { updatedReport, report, nextStatus }
}

/**
 * Deletes an NCR report by id. Returns the deleted record for audit context.
 */
export async function deleteNcrReport(id) {
  const { data: existing, error: existingError } = await supabase
    .from('ncr_reports').select('*').eq('id', id).maybeSingle()
  if (existingError) throw existingError
  if (!existing) throw Object.assign(new Error('NCR report not found.'), { status: 404 })

  const { error } = await supabase.from('ncr_reports').delete().eq('id', id)
  if (error) throw error

  return existing
}

/**
 * Assigns an NCR report to an employee. Replaces the former NCRAssignmentService.
 *
 * FIX: The original service selected only `id, reference_no` from ncr_reports but then
 * guarded on `report.assigned_to` — that field was never fetched, so the guard
 * silently always passed. Fixed by adding `assigned_to` to the select.
 *
 * FIX: The original service wrote to audit_logs directly AND called writeAudit(),
 * resulting in a double audit entry. The raw insert has been removed; writeAudit() is canonical.
 */
export async function assignReportToEmployee({ reportId, assignedToId, currentUserAuthId }) {
  const normalizedReportId = normalizeId(reportId)
  const normalizedAssignedToId = normalizeId(assignedToId)

  if (!normalizedReportId) throw new Error('Report id is required.')
  if (!normalizedAssignedToId) throw new Error('Assigned employee is required.')
  if (!currentUserAuthId) throw new Error('Missing x-user-auth-id header.')

  const { data: currentUser, error: currentUserError } = await supabase
    .from('users').select('id, user_name').eq('auth_id', currentUserAuthId).maybeSingle()
  if (currentUserError) throw currentUserError
  if (!currentUser) throw new Error('Current user profile not found.')

  const { data: assignee, error: assigneeError } = await supabase
    .from('users').select('id, user_name').eq('id', normalizedAssignedToId).maybeSingle()
  if (assigneeError) throw assigneeError
  if (!assignee) throw new Error('Assigned employee not found.')

  // assigned_to is now fetched so the re-assignment guard works correctly
  const { data: report, error: reportError } = await supabase
    .from('ncr_reports')
    .select('id, reference_no, assigned_to')
    .eq('id', normalizedReportId)
    .maybeSingle()
  if (reportError) throw reportError
  if (!report) throw new Error('NCR report not found.')
  if (report.assigned_to) throw new Error('This report is already assigned and cannot be reassigned.')

  const assignedAt = new Date().toISOString()

  const { data: updatedReport, error: updateError } = await supabase
    .from('ncr_reports')
    .update({ assigned_to: assignee.id, assigned_at: assignedAt, assigned_by: currentUser.id })
    .eq('id', normalizedReportId)
    .select('*')
    .maybeSingle()
  if (updateError) throw updateError

  const { error: notificationError } = await supabase
    .from('notifications')
    .insert([{
      user_id: assignee.id,
      title: `New Report Assigned: ${report.reference_no}`,
      message: `You have been assigned to investigate report ${report.reference_no}. Please review the details and submit your investigation.`,
      type: 'info',
      report_id: report.id,
      created_at: assignedAt,
      is_read: false,
    }])
  if (notificationError) throw notificationError

  try {
    await writeAudit({
      source: 'ncr_reports',
      action: 'assign_report',
      userAuthId: currentUserAuthId,
      details: {
        report_id: report.id,
        reference_no: report.reference_no,
        assigned_to: assignee.id,
      },
    })
  } catch (auditLogError) {
    console.warn('Failed to record assign_report audit log:', auditLogError?.message || auditLogError)
  }

  return { report: updatedReport || null, assignedTo: assignee }
}

export async function submitReportRating({ reportId, rating, userAuthId }) {
  const normalizedReportId = normalizeId(reportId)
  if (!normalizedReportId) throw new Error('Report id is required.')

  const { data: currentUser, error: currentUserError } = await supabase
    .from('users').select('id, user_name').eq('auth_id', userAuthId).maybeSingle()
  if (currentUserError) throw currentUserError
  if (!currentUser) throw new Error('Current user profile not found.')

  const { data: report, error: reportError } = await supabase
    .from('ncr_reports')
    .select('id, reference_no, status, issue_type, investigation_details, resolution_details')
    .eq('id', normalizedReportId)
    .maybeSingle()
  if (reportError) throw reportError
  if (!report) throw new Error('NCR report not found.')
  if (String(report.status || '').trim().toUpperCase() !== 'CLOSED') {
    throw Object.assign(new Error('Only closed reports can be rated.'), { status: 400 })
  }

  // Insert or update rating
  const { data: ratingData, error: ratingError } = await supabase
    .from('ncr_report_ratings')
    .upsert(
      { report_id: report.id, rated_by: currentUser.id, rating },
      { onConflict: 'report_id,rated_by' }
    )
    .select('*')
    .maybeSingle()
  if (ratingError) throw ratingError

  // Fetch updated average
  const { data: allRatings, error: allRatingsError } = await supabase
    .from('ncr_report_ratings')
    .select('rating')
    .eq('report_id', report.id)
  
  if (!allRatingsError && allRatings && allRatings.length > 0) {
    const avg = allRatings.reduce((sum, r) => sum + Number(r.rating), 0) / allRatings.length
    if (avg >= 3.0) {
      // Promote to case_repository
      const { data: existingCase, error: existingCaseError } = await supabase
        .from('case_repository')
        .select('id')
        .eq('corrective_action', report.investigation_details)
        .eq('preventive_action', report.resolution_details)
        .maybeSingle()
      
      if (!existingCase && !existingCaseError && report.investigation_details) {
        await supabase.from('case_repository').insert([{
          issue_type: report.issue_type || 'ncr',
          corrective_action: report.investigation_details,
          preventive_action: report.resolution_details || 'None provided',
          effectiveness_score: avg,
          problem_keywords: (report.description || '').slice(0, 200),
          times_used: 1
        }])
      } else if (existingCase) {
        // Update effectiveness score
        await supabase.from('case_repository').update({ effectiveness_score: avg })
          .eq('id', existingCase.id)
      }
    }
  }

  try {
    await writeAudit({
      source: 'report_ratings',
      action: 'rate_report',
      userAuthId,
      details: { report_id: report.id, rating }
    })
  } catch (err) {
    console.warn('Failed to audit rate_report:', err)
  }

  return ratingData
}

export async function getReportRatingsStats({ reportId, userAuthId }) {
  const normalizedReportId = normalizeId(reportId)
  if (!normalizedReportId) throw new Error('Report id is required.')

  const { data: currentUser } = await supabase
    .from('users').select('id').eq('auth_id', userAuthId).maybeSingle()

  const { data: allRatings, error: allRatingsError } = await supabase
    .from('ncr_report_ratings')
    .select('rating, rated_by')
    .eq('report_id', normalizedReportId)
  
  if (allRatingsError) throw allRatingsError

  const userRating = allRatings && currentUser
    ? allRatings.find(r => String(r.rated_by) === String(currentUser.id))?.rating || null
    : null
  
  let total = 0
  
  const validRatings = allRatings || []
  for (const r of validRatings) {
    total += Number(r.rating)
  }

  const average = validRatings.length > 0 ? (total / validRatings.length) : 0

  return {
    average: Number(average.toFixed(1)),
    count: validRatings.length,
    userRating
  }
}