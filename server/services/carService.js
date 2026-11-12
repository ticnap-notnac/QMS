import { supabase } from '../lib/supabase.js'
import { CAR_STATUS } from '../../shared/constants.js'
import { safeCreateNotificationsForRolesAndDepartment } from '../lib/notificationHelper.js'
import { writeAudit } from '../lib/audit.js'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeRole(value) {
  return normalizeText(value).toLowerCase()
}

function isAdminRole(roleName) {
  const norm = normalizeRole(roleName)
  if (!norm) return false
  return (
    norm === 'admin' ||
    norm === 'super admin' ||
    norm === 'super_admin' ||
    norm === 'system administrator' ||
    norm === 'system_administrator' ||
    norm === 'administrator' ||
    norm === 'superadmin'
  )
}

function isPrivilegedCarVerifier(roleName, permissions = null) {
  const norm = normalizeRole(roleName)
  if (isAdminRole(norm) || ['qa officer', 'auditor', 'quality assurance'].includes(norm)) {
    return true
  }
  const pages = Array.isArray(permissions?.pages) ? permissions.pages : []
  const rights = Array.isArray(permissions?.rights) ? permissions.rights : []
  return (
    pages.includes('audit_tools') ||
    pages.includes('iso') ||
    rights.includes('manage_iso') ||
    rights.includes('edit_delete_report')
  )
}

async function getUserProfileByAuthId(authId) {
  if (!authId) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, auth_id, role_id, position_id, department_id, site_id, user_name, first_name, last_name')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error) throw error
  if (!profile) return null

  let resolvedRoleId = profile.role_id || null
  if (!resolvedRoleId && profile.position_id) {
    const { data: posData } = await supabase
      .from('positions')
      .select('role_id')
      .eq('id', profile.position_id)
      .maybeSingle()
    if (posData?.role_id) resolvedRoleId = posData.role_id
  }

  let roleName = null
  let permissions = null
  if (resolvedRoleId) {
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('role_name, permissions')
      .eq('id', resolvedRoleId)
      .maybeSingle()
    if (roleError) throw roleError
    roleName = roleData?.role_name || null
    permissions = roleData?.permissions || null
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

  return { ...profile, role_name: roleName, permissions, department_name: departmentName }
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

function buildCarReferenceNumber(recordsOrLatestRef) {
  if (Array.isArray(recordsOrLatestRef)) {
    let maxSeq = 0
    for (const r of recordsOrLatestRef) {
      const match = String(r?.reference_no || '').match(/^CAR-(\d+)$/i)
      if (match) {
        const seq = parseInt(match[1], 10)
        if (seq > maxSeq) maxSeq = seq
      }
    }
    return maxSeq
  }
  const match = String(recordsOrLatestRef || '').match(/^CAR-(\d+)$/i)
  if (!match) return 0
  return Number(match[1]) || 0
}

/**
 * Creates a new CAR report.
 *
 * @param {Object} params
 * @param {Object} params.body
 * @param {string} params.reportedByAuthId
 * @returns {Promise<{data: Object}>}
 */
export async function createCarReport({ body, reportedByAuthId }) {
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
    clause_ids,
    audit_schedule_id
  } = body || {}

  const { data: creatorObj } = await supabase
    .from('users')
    .select('site_id')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()

  const getNextRef = async () => {
    if (typeof supabase.rpc === 'function') {
      const { data: rpcRef, error: rpcErr } = await supabase.rpc('next_report_reference', {
        p_type: 'CAR',
      })
      if (!rpcErr && rpcRef) return rpcRef
    }

    const { data: records, error: latestError } = await supabase
      .from('car_reports')
      .select('reference_no')
      .ilike('reference_no', 'CAR-%')
      .order('id', { ascending: false })
      .limit(1000)

    if (latestError) {
      const customErr = new Error(`Database error getting latest CAR ref: ${latestError.message}`)
      customErr.status = 500
      throw customErr
    }

    const maxSeq = buildCarReferenceNumber(records || [])
    return `CAR-${String(maxSeq + 1).padStart(3, '0')}`
  }

  let generatedReferenceNo = await getNextRef()
  let data = null
  let error = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) {
      generatedReferenceNo = await getNextRef()
    }

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
      audit_schedule_id: audit_schedule_id || null,
      status: CAR_STATUS.OPEN,
      site_id: creatorObj?.site_id || null
    }

    const res = await supabase.from('car_reports').insert(payload).select('*').maybeSingle()
    if (!res.error) {
      data = res.data
      error = null
      break
    }
    error = res.error
    if (res.error.code !== '23505') break
  }

  if (error) {
    const customErr = new Error(`Database error creating CAR: ${error.message}`)
    customErr.status = 500
    throw customErr
  }

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

  if (data?.id) {
    import('./trendClusteringService.js').then(m => {
      m.analyzeAndClusterCarReportInBackground(data.id)
    }).catch(err => {
      console.warn('[carService] Failed to trigger CAR trend clustering:', err.message)
    })
  }

  return { data }
}

/**
 * Submits a CAPA report for an existing CAR.
 *
 * @param {Object} params
 * @param {string|number} params.carId
 * @param {string} params.rootCauseAnalysis
 * @param {string} params.correctiveAction
 * @param {string} params.preventiveAction
 * @param {string} params.targetVerificationDate
 * @param {string} params.actorAuthId
 * @returns {Promise<{data: Object}>}
 */
export async function submitCapaReport({ carId, rootCauseAnalysis, correctiveAction, preventiveAction, targetVerificationDate, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('car_reports')
    .select('id, reference_no, status, requesting_department, responsible_department, site_id')
    .eq('id', carId)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('CAR report not found')
    err.status = 404
    throw err
  }

  if (String(existing.status || '').toLowerCase() === CAR_STATUS.CLOSED) {
    const err = new Error('Cannot submit a CAPA plan for a closed CAR report.')
    err.status = 400
    throw err
  }

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

/**
 * Verifies the effectiveness of a CAR.
 *
 * @param {Object} params
 * @param {string|number} params.carId
 * @param {string} params.outcome
 * @param {string} params.notes
 * @param {number|string} params.verificationRating
 * @param {string} params.actorAuthId
 * @returns {Promise<{data: Object}>}
 */
export async function verifyCarEffectiveness({ carId, outcome, notes, verificationRating, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('car_reports')
    .select('id, reference_no, status, requesting_department, responsible_department, site_id')
    .eq('id', carId)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('CAR report not found')
    err.status = 404
    throw err
  }

  if (String(existing.status || '').toLowerCase() !== CAR_STATUS.UNDER_VERIFICATION) {
    const err = new Error('Only CAR reports under verification can be verified.')
    err.status = 400
    throw err
  }

  const profile = await getUserProfileByAuthId(actorAuthId)
  if (!profile) {
    const err = new Error('Current user profile not found')
    err.status = 403
    throw err
  }

  if (!isAdminRole(profile.role_name) && profile.site_id && existing.site_id && String(profile.site_id) !== String(existing.site_id)) {
    const err = new Error('You can only verify CARs belonging to your assigned site.')
    err.status = 403
    throw err
  }

  const isPrivileged = isPrivilegedCarVerifier(profile.role_name, profile.permissions)
  const hasExplicitVerifyRight = Array.isArray(profile.permissions?.rights) && profile.permissions.rights.includes('verify_car')
  if (!isPrivileged && !hasExplicitVerifyRight) {
    const userDepartmentName = normalizeText(profile.department_name).toLowerCase()
    const allowedDepartmentNames = [existing.responsible_department, existing.requesting_department]
      .map((name) => normalizeText(name).toLowerCase())
      .filter(Boolean)

    if (!userDepartmentName || (allowedDepartmentNames.length > 0 && !allowedDepartmentNames.includes(userDepartmentName))) {
      const err = new Error('You can only verify CARs in your own department.')
      err.status = 403
      throw err
    }
  }

  const status = outcome === 'effective' ? CAR_STATUS.CLOSED : CAR_STATUS.OPEN

  const { data, error } = await supabase
    .from('car_reports')
    .update({
      verification_notes: notes,
      verification_date: new Date().toISOString(),
      verified_by: actorAuthId,
      verification_rating: verificationRating ? String(verificationRating).trim() : null,
      status: status
    })
    .eq('id', carId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  if (status === CAR_STATUS.CLOSED && data) {
    autoPromoteCarToCaseRepository(data).catch((err) => {
      console.warn('[carService] Failed to auto-promote CAR to case repository:', err.message || err)
    })
  }

  try {
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
 * Returns all CARs linked to a specific ISO clause.
 *
 * @param {string|number} clauseId
 * @returns {Promise<Object[]>}
 */
export async function fetchCarsForClause(clauseId, actorAuthId = null) {
  let callerSiteId = null
  if (actorAuthId) {
    const profile = await getUserProfileByAuthId(actorAuthId)
    if (profile && !isAdminRole(profile.role_name) && profile.site_id) {
      callerSiteId = profile.site_id
    }
  }

  const { data, error } = await supabase
    .from('car_clause_links')
    .select(`
      car_reports (
        id,
        reference_no,
        status,
        details_of_nonconformance,
        created_at,
        site_id
      )
    `)
    .eq('clause_id', clauseId)

  if (error) throw error

  return (data || [])
    .map(row => row.car_reports)
    .filter(car => {
      if (!car) return false
      if (callerSiteId && car.site_id && String(car.site_id) !== String(callerSiteId)) return false
      return true
    })
}

/**
 * Fetches a CAR report by its ID.
 *
 * @param {string|number} carId
 * @param {string|null} [actorAuthId=null]
 * @returns {Promise<Object|null>}
 */
export async function fetchCarReportById(carId, actorAuthId = null) {
  const { data, error } = await supabase
    .from('car_reports')
    .select('*')
    .eq('id', carId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  if (actorAuthId) {
    const profile = await getUserProfileByAuthId(actorAuthId)
    if (profile && !isAdminRole(profile.role_name) && profile.site_id && data.site_id && String(profile.site_id) !== String(data.site_id)) {
      const err = new Error('You do not have access to a CAR report from another site.')
      err.status = 403
      throw err
    }
  }

  return data
}

/**
 * Batch-fetches all CARs linked to a set of clause IDs.
 *
 * @param {Array<string|number>} clauseIds
 * @returns {Promise<Object>}
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
 * Soft deletes a CAR report and its clause links.
 *
 * @param {Object} params
 * @param {string|number} params.carId
 * @param {string} params.actorAuthId
 * @returns {Promise<{data: Object}>}
 */
export async function softDeleteCarReport({ carId, actorAuthId }) {
  await supabase.from('car_clause_links').delete().eq('car_report_id', carId)
  
  const { data, error } = await supabase
    .from('car_reports')
    .delete()
    .eq('id', carId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  try {
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
 * Updates an existing CAR report and its clause links (supports partial updates).
 *
 * @param {Object} params
 * @param {string|number} params.carId
 * @param {Object} params.body
 * @param {string} params.actorAuthId
 * @returns {Promise<{data: Object}>}
 */
export async function updateCarReport({ carId, body = {}, actorAuthId }) {
  const payload = {}

  const stringOrNullKeys = [
    'requesting_department',
    'responsible_department',
    'requestor',
    'recipient',
    'reason_reissue',
    'others',
    'product_material_name',
    'model_type',
    'control_no',
    'details_of_nonconformance',
  ]

  for (const key of stringOrNullKeys) {
    if (body[key] !== undefined) {
      payload[key] = body[key]
    }
  }

  const dateKeys = ['date', 'request_date']
  for (const key of dateKeys) {
    if (body[key] !== undefined) {
      payload[key] = body[key] ? body[key] : null
    }
  }

  const booleanKeys = [
    'no_reply',
    're_corrective_action',
    'quality_food_safety',
    'environment_health_safety',
    'security_issue',
    'internal_audit',
    'customer_complaint',
    'government_agency_audit',
    'customer_audit_nonconformance',
    'vendor_nonconformance',
  ]

  for (const key of booleanKeys) {
    if (body[key] !== undefined) {
      payload[key] = Boolean(body[key])
    }
  }

  if (body.affected_quantity !== undefined) {
    payload.affected_quantity = body.affected_quantity ? parseInt(body.affected_quantity, 10) : null
  }

  let data = null
  if (Object.keys(payload).length > 0) {
    const { data: updated, error } = await supabase
      .from('car_reports')
      .update(payload)
      .eq('id', carId)
      .select('*')
      .maybeSingle()

    if (error) throw error
    data = updated
  } else {
    data = await fetchCarReportById(carId)
  }

  const { clause_ids } = body || {}
  if (Array.isArray(clause_ids)) {
    await supabase.from('car_clause_links').delete().eq('car_report_id', carId)

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

  if (data && String(data.status || '').toLowerCase() === CAR_STATUS.CLOSED) {
    autoPromoteCarToCaseRepository(data).catch((err) => {
      console.warn('[carService] Failed to auto-promote CAR to case repository on update:', err.message || err)
    })
  }

  return { data }
}

/**
 * Automatically promotes a closed CAR report into the `car_case_repository`
 * for Case-Based Reasoning (CBR) retrieval and vector similarity search.
 *
 * @param {Object} car - The closed CAR report record.
 */
export async function autoPromoteCarToCaseRepository(car) {
  if (!car || !car.id) return null
  const details = String(car.details_of_nonconformance || '').trim()
  if (!details) return null

  try {
    const apiKey = process.env.GEMINI_API_KEY
    let embedding = null
    if (apiKey) {
      const { generateEmbedding } = await import('../utils/cbr.js')
      embedding = await generateEmbedding(details, apiKey)
    }

    let issueCategory = 'general'
    if (car.customer_complaint) issueCategory = 'customer_complaint'
    else if (car.internal_audit) issueCategory = 'internal_audit'
    else if (car.customer_audit_nonconformance) issueCategory = 'customer_audit'
    else if (car.government_agency_audit) issueCategory = 'government_agency_audit'
    else if (car.vendor_nonconformance) issueCategory = 'vendor_nonconformance'
    else if (car.quality_food_safety) issueCategory = 'quality_food_safety'
    else if (car.environment_health_safety) issueCategory = 'environment_health_safety'
    else if (car.security_issue) issueCategory = 'security_issue'

    const record = {
      car_id: car.id,
      reference_no: car.reference_no,
      details_of_nonconformance: details,
      root_cause_analysis: car.root_cause_analysis || null,
      corrective_action: car.corrective_action || 'No corrective action recorded',
      preventive_action: car.preventive_action || null,
      issue_category: issueCategory,
      requesting_department: car.requesting_department || null,
      responsible_department: car.responsible_department || null,
      product_material_name: car.product_material_name || null,
      effectiveness_score: 1.0,
      embedding: embedding ? `[${embedding.join(',')}]` : null
    }

    const { data: existing } = await supabase
      .from('car_case_repository')
      .select('id')
      .eq('car_id', car.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('car_case_repository')
        .update(record)
        .eq('id', existing.id)
    } else {
      await supabase
        .from('car_case_repository')
        .insert([record])
    }
  } catch (err) {
    console.warn('[carService] autoPromoteCarToCaseRepository warning:', err.message || err)
  }
}
