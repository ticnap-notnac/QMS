import { supabase } from '../lib/supabase.js'

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
    ncr_ids
  } = body || {}

  const { data: latest, error: latestError } = await supabase
    .from('car_reports')
    .select('reference_no')
    .ilike('reference_no', 'CAR-%')
    .order('reference_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    const customErr = new Error(`Database error getting latest CAR ref: ${latestError.message}`)
    customErr.status = 500
    throw customErr
  }

  const generatedReferenceNo = `CAR-${String(buildCarReferenceNumber(latest?.reference_no) + 1).padStart(3, '0')}`

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
    status: 'open'
  }

  const { data, error } = await supabase.from('car_reports').insert(payload).select('*').maybeSingle()

  if (error) {
    const customErr = new Error(`Database error creating CAR: ${error.message}`)
    customErr.status = 500
    throw customErr
  }

  return { data }
}

export async function submitCapaReport({ carId, rootCauseAnalysis, correctiveAction, preventiveAction, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('car_reports')
    .select('id, reference_no, status')
    .eq('id', carId)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('CAR report not found')
    err.status = 404
    throw err
  }

  const { data, error } = await supabase
    .from('car_reports')
    .update({
      root_cause_analysis: rootCauseAnalysis,
      corrective_action: correctiveAction,
      preventive_action: preventiveAction,
      capa_submitted_at: new Date().toISOString(),
      status: 'under_verification'
    })
    .eq('id', carId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  // Create notifications for admins and auditors to verify
  try {
    const { createNotificationsForRoles } = await import('./ncrReportsService.js')
    await createNotificationsForRoles({
      roleNames: ['admin', 'auditor'],
      title: `CAR CAPA Submitted: ${existing.reference_no}`,
      message: `A CAPA plan has been submitted for ${existing.reference_no} and is awaiting Verification of Effectiveness (VoE).`,
      type: 'info'
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

export async function verifyCarEffectiveness({ carId, outcome, notes, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('car_reports')
    .select('id, reference_no, status')
    .eq('id', carId)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('CAR report not found')
    err.status = 404
    throw err
  }

  const status = outcome === 'effective' ? 'closed' : 'open'

  const { data, error } = await supabase
    .from('car_reports')
    .update({
      verification_notes: notes,
      verification_date: new Date().toISOString(),
      verified_by: actorAuthId,
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

