import { supabase } from '../lib/supabase.js'
import { CAR_STATUS } from '../../shared/constants.js'
import { safeCreateNotificationsForRolesAndDepartment } from '../lib/notificationHelper.js'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeRole(value) {
  return normalizeText(value).toLowerCase()
}

async function getUserProfileByAuthId(authId) {
  if (!authId) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, auth_id, role_id, department_id, user_name, first_name, last_name')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error) throw error
  if (!profile) return null

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

  let departmentName = null
  if (profile.department_id) {
    const { data: departmentData, error: departmentError } = await supabase
      .from('departments')
      .select('department_name')
      .eq('id', profile.department_id)
      .maybeSingle()
    if (departmentError) throw departmentError
    departmentName = departmentData?.department_name || null
  }

  return { ...profile, role_name: roleName, department_name: departmentName }
}

async function resolveDepartmentIdByName(preferredNames = []) {
  const normalizedNames = preferredNames
    .map((name) => normalizeText(name).toLowerCase())
    .filter(Boolean)

  if (normalizedNames.length === 0) return null

  const { data, error } = await supabase
    .from('departments')
    .select('id, department_name')

  if (error) throw error

  const match = (data || []).find((department) =>
    normalizedNames.includes(normalizeText(department.department_name).toLowerCase())
  )

  return match?.id ?? null
}

function buildCarReferenceNumber(referenceNo) {
  const match = String(referenceNo || '').match(/^CAR-(\d{3,})$/i)
  if (!match) return 0
  return Number(match[1]) || 0
}

export async function createCarReport({ body, reportedByAuthId }) {
  // We assume reportedByAuthId maps to a user who is creating it, though CAR has specific 'requestor' fields.
  
  // Extract all fields that match car_reports table
  const {
    requesting_department,
    responsible_department,
    requestor,
    recipient,
    date,
    reason_reissue,
    no_reply,
    re_corrective_action,
    quality_food_safety,
    environment_health_safety,
    security_issue,
    internal_audit,
    customer_complaint,
    government_agency_audit,
    customer_audit_nonconformance,
    vendor_nonconformance,
    others,
    product_material_name,
    model_type,
    control_no,
    affected_quantity,
    details_of_nonconformance,
    request_date,
    ncr_ids,
    clause_ids,   // array of iso_clauses.id values to link to this CAR
    audit_schedule_id
  } = body || {}

  const { data: creatorObj } = await supabase
    .from('users')
    .select('site_id')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()

  const { data: records, error: latestError } = await supabase
    .from('car_reports')
    .select('reference_no')
    .ilike('reference_no', 'CAR-%')
    .order('reference_no', { ascending: false })
    .limit(50)

  if (latestError) {
    const customErr = new Error(`Database error getting latest CAR ref: ${latestError.message}`)
    customErr.status = 500
    throw customErr
  }

  const latestNumeric = (records || []).find(r => /^CAR-\d+$/i.test(r.reference_no))
  const generatedReferenceNo = `CAR-${String(buildCarReferenceNumber(latestNumeric?.reference_no) + 1).padStart(3, '0')}`

  const payload = {
    reference_no: generatedReferenceNo,
    requesting_department,
    responsible_department,
    requestor,
    recipient,
    date: date ? date : null,
    reason_reissue,
    no_reply: Boolean(no_reply),
    re_corrective_action: Boolean(re_corrective_action),
    quality_food_safety: Boolean(quality_food_safety),
    environment_health_safety: Boolean(environment_health_safety),
    security_issue: Boolean(security_issue),
    internal_audit: Boolean(internal_audit),
    customer_complaint: Boolean(customer_complaint),
    government_agency_audit: Boolean(government_agency_audit),
    customer_audit_nonconformance: Boolean(customer_audit_nonconformance),
    vendor_nonconformance: Boolean(vendor_nonconformance),
    others,
    product_material_name,
    model_type,
    control_no,
    affected_quantity: affected_quantity ? parseInt(affected_quantity, 10) : null,
    details_of_nonconformance,
    request_date: request_date ? request_date : null,
    ncr_id: Array.isArray(ncr_ids) && ncr_ids.length > 0 ? ncr_ids.map(id => parseInt(id, 10)) : null,
    audit_schedule_id: audit_schedule_id || null,
    status: CAR_STATUS.OPEN,
    site_id: creatorObj?.site_id || null
  }

  const { data, error } = await supabase.from('car_reports').insert(payload).select('*').maybeSingle()

  if (error) {
    const customErr = new Error(`Database error creating CAR: ${error.message}`)
    customErr.status = 500
    throw customErr
  }

  // Link this CAR to the provided ISO clause IDs (if any)
  // iso_clauses.id is UUID — keep them as strings, just filter blanks
  if (data?.id && Array.isArray(clause_ids) && clause_ids.length > 0) {
    const linkRows = clause_ids
      .map(cid => String(cid).trim())
      .filter(cid => cid.length > 0)
      .map(cid => ({ car_report_id: data.id, clause_id: cid }))

    if (linkRows.length > 0) {
      const { error: linkError } = await supabase
        .from('car_clause_links')
        .insert(linkRows)

      if (linkError) {
        console.warn('[carService] Failed to insert car_clause_links:', linkError.message)
      }
    }
  }


  return { data }
}

export async function submitCapaReport({ carId, rootCauseAnalysis, correctiveAction, preventiveAction, targetVerificationDate, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('car_reports')
    .select('id, reference_no, status, requesting_department, responsible_department')
    .eq('id', carId)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('CAR report not found')
    err.status = 404
    throw err
  }

  // Removed hardcoded 'auditor' role check; deferring to dynamic route permissions.

  const { data, error } = await supabase
    .from('car_reports')
    .update({
      root_cause_analysis: rootCauseAnalysis,
      corrective_action: correctiveAction,
      preventive_action: preventiveAction,
      target_verification_date: targetVerificationDate || null,
      capa_submitted_at: new Date().toISOString(),
      status: CAR_STATUS.UNDER_VERIFICATION
    })
    .eq('id', carId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  // Create notifications for users in the relevant department to verify effectiveness.
  try {
    const departmentId = await resolveDepartmentIdByName([
      existing?.responsible_department,
      existing?.requesting_department
    ])

    await safeCreateNotificationsForRolesAndDepartment({
      globalRoleNames: departmentId ? ['admin', 'qa officer'] : ['admin', 'qa officer', 'user'],
      departmentRoleNames: departmentId ? ['user'] : [],
      departmentId,
      title: `CAR VoE Pending: ${existing.reference_no}`,
      message: `A CAPA plan has been submitted for ${existing.reference_no}. Please verify the effectiveness in your department.`,
      type: 'warning',
      reportId: existing.id
    })
  } catch (err) {
    console.warn('Failed to send CAPA alerts:', err.message || err)
  }

  try {
    const { writeAudit } = await import('../lib/audit.js')
    await writeAudit({
      level: 'audit',
      source: 'car_reports',
      action: 'car_capa_submit',
      userAuthId: actorAuthId,
      details: { id: carId, reference_no: existing.reference_no }
    })
  } catch (err) {
    console.warn('Failed to write CAPA audit log:', err.message || err)
  }

  return { data }
}

export async function verifyCarEffectiveness({ carId, outcome, notes, verificationRating, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('car_reports')
    .select('id, reference_no, status, requesting_department, responsible_department')
    .eq('id', carId)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('CAR report not found')
    err.status = 404
    throw err
  }

  const profile = await getUserProfileByAuthId(actorAuthId)
  if (!profile) {
    const err = new Error('Current user profile not found')
    err.status = 403
    throw err
  }

  const userDepartmentName = normalizeText(profile.department_name).toLowerCase()
  const allowedDepartmentNames = [existing.responsible_department, existing.requesting_department]
    .map((name) => normalizeText(name).toLowerCase())
    .filter(Boolean)

  if (!userDepartmentName || allowedDepartmentNames.length === 0 || !allowedDepartmentNames.includes(userDepartmentName)) {
    const err = new Error('You can only verify CARs in your own department.')
    err.status = 403
    throw err
  }

  const status = outcome === 'effective' ? CAR_STATUS.CLOSED : CAR_STATUS.OPEN

  const { data, error } = await supabase
    .from('car_reports')
    .update({
      verification_notes: notes,
      verification_date: new Date().toISOString(),
      verified_by: actorAuthId,
      verification_rating: verificationRating || null,
      status: status
    })
    .eq('id', carId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  try {
    const { writeAudit } = await import('../lib/audit.js')
    await writeAudit({
      level: 'audit',
      source: 'car_reports',
      action: 'car_voe_verify',
      userAuthId: actorAuthId,
      details: { id: carId, reference_no: existing.reference_no, outcome, status }
    })
  } catch (err) {
    console.warn('Failed to write VoE audit log:', err.message || err)
  }

  return { data }
}

/**
 * Returns all CARs linked to a specific ISO clause via car_clause_links.
 * Used by the Audit Checklist to show open CARs alongside each clause row.
 *
 * @param {number} clauseId
 */
export async function fetchCarsForClause(clauseId) {
  const { data, error } = await supabase
    .from('car_clause_links')
    .select(`
      car_reports (
        id,
        reference_no,
        status,
        details_of_nonconformance,
        created_at
      )
    `)
    .eq('clause_id', clauseId)

  if (error) throw error

  return (data || []).map(row => row.car_reports).filter(Boolean)
}

export async function fetchCarReportById(carId) {
  const { data, error } = await supabase
    .from('car_reports')
    .select('*')
    .eq('id', carId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

/**
 * Batch-fetches all CARs linked to a set of clause IDs.
 * Used by handleStartAudit() to load all linked CARs in one query.
 *
 * @param {number[]} clauseIds
 * @returns {Object} Map of { [clause_id]: [{ id, reference_no, status }] }
 */
export async function fetchLinkedCarsForClauses(clauseIds) {
  if (!clauseIds?.length) return {}

  const { data, error } = await supabase
    .from('car_clause_links')
    .select(`
      clause_id,
      car_reports (
        id,
        reference_no,
        status
      )
    `)
    .in('clause_id', clauseIds)

  if (error) throw error

  const map = {}
  for (const row of data || []) {
    if (!row.car_reports) continue
    if (!map[row.clause_id]) map[row.clause_id] = []
    map[row.clause_id].push(row.car_reports)
  }
  return map
}

/**
 * Hard deletes a CAR report
 */
export async function softDeleteCarReport({ carId, actorAuthId }) {
  // 1. First delete the links
  await supabase.from('car_clause_links').delete().eq('car_report_id', carId)
  
  // 2. Delete the report itself
  const { data, error } = await supabase
    .from('car_reports')
    .delete()
    .eq('id', carId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  try {
    const { writeAudit } = await import('../lib/audit.js')
    await writeAudit({
      level: 'audit',
      source: 'car_reports',
      action: 'car_soft_delete',
      userAuthId: actorAuthId,
      details: { id: carId, reference_no: data?.reference_no }
    })
  } catch (err) {
    console.warn('Failed to write audit log:', err.message || err)
  }

  return { data }
}

/**
 * Updates a CAR report
 */
export async function updateCarReport({ carId, body, actorAuthId }) {
  const payload = {
    requesting_department: body.requesting_department,
    responsible_department: body.responsible_department,
    requestor: body.requestor,
    recipient: body.recipient,
    date: body.date ? body.date : null,
    reason_reissue: body.reason_reissue,
    no_reply: Boolean(body.no_reply),
    re_corrective_action: Boolean(body.re_corrective_action),
    quality_food_safety: Boolean(body.quality_food_safety),
    environment_health_safety: Boolean(body.environment_health_safety),
    security_issue: Boolean(body.security_issue),
    internal_audit: Boolean(body.internal_audit),
    customer_complaint: Boolean(body.customer_complaint),
    government_agency_audit: Boolean(body.government_agency_audit),
    customer_audit_nonconformance: Boolean(body.customer_audit_nonconformance),
    vendor_nonconformance: Boolean(body.vendor_nonconformance),
    others: body.others,
    product_material_name: body.product_material_name,
    model_type: body.model_type,
    control_no: body.control_no,
    affected_quantity: body.affected_quantity ? parseInt(body.affected_quantity, 10) : null,
    details_of_nonconformance: body.details_of_nonconformance,
    request_date: body.request_date ? body.request_date : null
  }

  const { data, error } = await supabase
    .from('car_reports')
    .update(payload)
    .eq('id', carId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  // Handle clause links
  const { clause_ids } = body || {}
  if (Array.isArray(clause_ids)) {
    // 1. Delete existing links
    await supabase.from('car_clause_links').delete().eq('car_report_id', carId)

    // 2. Insert new links
    const linkRows = clause_ids
      .map(cid => String(cid).trim())
      .filter(cid => cid.length > 0)
      .map(cid => ({ car_report_id: carId, clause_id: cid }))

    if (linkRows.length > 0) {
      const { error: linkError } = await supabase
        .from('car_clause_links')
        .insert(linkRows)

      if (linkError) {
        console.warn('[carService] Failed to insert car_clause_links during update:', linkError.message)
      }
    }
  }

  try {
    const { writeAudit } = await import('../lib/audit.js')
    await writeAudit({
      level: 'audit',
      source: 'car_reports',
      action: 'car_update',
      userAuthId: actorAuthId,
      details: { id: carId, reference_no: data?.reference_no }
    })
  } catch (err) {
    console.warn('Failed to write audit log:', err.message || err)
  }

  return { data }
}
