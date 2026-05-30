import { hasServiceRole, supabase } from '../lib/supabase.js'
import { getRequestActor } from '../lib/requestUtils.js'
import { writeAudit } from '../lib/audit.js'

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

async function getReporterMaps(reports) {
  const reporterAuthIds = [...new Set(reports.map((report) => report.reported_by).filter(Boolean))]

  if (reporterAuthIds.length === 0) {
    return {
      userByAuthId: new Map(),
      roleById: new Map(),
      departmentById: new Map(),
    }
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, auth_id, role_id, department_id')
    .in('auth_id', reporterAuthIds)

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
    userByAuthId: new Map((users || []).map((user) => [user.auth_id, user])),
    roleById: new Map((rolesResult.data || []).map((role) => [String(role.id), role.role_name])),
    departmentById: new Map((departmentsResult.data || []).map((department) => [String(department.id), department.department_name])),
  }
}

export async function getReports(_req, res) {
  const { data, error } = await supabase
    .from('ncr_reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const reports = data || []

  try {
    const { userByAuthId, roleById, departmentById } = await getReporterMaps(reports)

    const enriched = reports.map((report) => {
      const reporter = userByAuthId.get(report.reported_by)
      const reporterFullName = reporter
        ? `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() || reporter.user_name || null
        : null

      return {
        ...report,
        reporter_full_name: reporterFullName,
        reporter_role_name: reporter ? roleById.get(String(reporter.role_id)) || null : null,
        reporter_department_name: reporter ? departmentById.get(String(reporter.department_id)) || null : null,
      }
    })

    return res.json(enriched)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export async function createReport(req, res) {
  const {
    product_type,
    batch_number,
    complaint_location,
    severity,
    department_id,
    description,
    car_filed = false,
    qddr_filed = false,
    evidence_url = null,
  } = req.body || {}

  const reportedByAuthId = getRequestActor(req)

  if (!reportedByAuthId) {
    return res.status(400).json({ error: 'Missing x-user-auth-id header.' })
  }

  if (!product_type || !batch_number || !complaint_location || !severity || !department_id || !description) {
    return res.status(400).json({ error: 'Product type, batch number, location, severity, department, and description are required.' })
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

  const payload = {
    reference_no: referenceNo,
    reported_by: reporter.id,
    status: 'open',
    product_type,
    batch_number,
    complaint_location,
    severity,
    department_id: normalizeId(department_id),
    description,
    car_filed: Boolean(car_filed),
    qddr_filed: Boolean(qddr_filed),
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
    batch_number,
    complaint_location,
    severity,
    department_id,
    description,
    car_filed,
    qddr_filed,
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

  const updates = {}
  if (product_type !== undefined) updates.product_type = product_type
  if (batch_number !== undefined) updates.batch_number = batch_number
  if (complaint_location !== undefined) updates.complaint_location = complaint_location
  if (severity !== undefined) updates.severity = severity
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