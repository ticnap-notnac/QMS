import { supabase } from '../lib/supabase.js'

function buildQddrReferenceNumber(referenceNo) {
  const match = String(referenceNo || '').match(/^QDDR-(\d{3,})$/i)
  if (!match) return 0
  return Number(match[1]) || 0
}

async function findUserIdByName(name) {
  if (!name) return null
  // SearchableDropdown labels look like "Name — Role"
  const cleanName = String(name).split('—')[0].trim()
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('user_name', cleanName)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn(`[qddrService] Failed to resolve user for "${cleanName}":`, error.message)
    return null
  }
  return data?.id || null
}

export async function createQddrReport({ body, reportedByAuthId }) {
  // Resolve reporter from auth actor
  const { data: reporter, error: reporterError } = await supabase
    .from('users')
    .select('id, site_id')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()

  if (reporterError) throw reporterError
  if (!reporter) throw Object.assign(new Error('Reporter profile not found.'), { status: 404 })

  // Extract all fields matching qddr_reports schema
  const {
    location,
    date,
    time,
    trucker_broker,
    plate_number,
    container_number,
    po_reference,
    drwb_number,
    brand_supplier,
    material_description,
    material_code,
    batch_code_su_number,
    holes_punctures,
    deformed_torn,
    open_carton,
    crushed_dented,
    wet_leaked,
    stain_graffiti,
    bulging,
    improper_stretch_wrapping,
    wrong_no_batchcode,
    opened_seal,
    no_label_broken_label,
    short_pack,
    excess_shipment,
    documentation_error,
    picking_discrepancy,
    others,
    qty,
    reason_of_discrepancy,
    corrective_action,
    preventive_action,
    approved_by,
    noted_by,
    leader,
    ncr_id
  } = body || {}

  // Resolve user IDs for signatures
  const [approvedById, notedById, leaderId] = await Promise.all([
    findUserIdByName(approved_by),
    findUserIdByName(noted_by),
    findUserIdByName(leader)
  ])

  // Get next sequential reference number
  const { data: records, error: latestError } = await supabase
    .from('qddr_reports')
    .select('reference_no')
    .ilike('reference_no', 'QDDR-%')
    .order('reference_no', { ascending: false })
    .limit(50)

  if (latestError) {
    const customErr = new Error(`Database error getting latest QDDR ref: ${latestError.message}`)
    customErr.status = 500
    throw customErr
  }

  const latestNumeric = (records || []).find(r => /^QDDR-\d+$/i.test(r.reference_no))
  const generatedReferenceNo = `QDDR-${String(buildQddrReferenceNumber(latestNumeric?.reference_no) + 1).padStart(3, '0')}`

  const payload = {
    reference_no: generatedReferenceNo,
    location,
    date: date ? date : null,
    time: time ? time : null,
    trucker_broker,
    plate_number,
    container_number,
    po_reference,
    drwb_number,
    brand_supplier,
    material_description,
    material_code,
    batch_code_su_number,
    holes_punctures: Boolean(holes_punctures),
    deformed_torn: Boolean(deformed_torn),
    open_carton: Boolean(open_carton),
    crushed_dented: Boolean(crushed_dented),
    wet_leaked: Boolean(wet_leaked),
    stain_graffiti: Boolean(stain_graffiti),
    bulging: Boolean(bulging),
    improper_stretch_wrapping: Boolean(improper_stretch_wrapping),
    wrong_no_batchcode: Boolean(wrong_no_batchcode),
    opened_seal: Boolean(opened_seal),
    no_label_broken_label: Boolean(no_label_broken_label),
    short_pack: Boolean(short_pack),
    excess_shipment: Boolean(excess_shipment),
    documentation_error: Boolean(documentation_error),
    picking_discrepancy: Boolean(picking_discrepancy),
    others,
    qty: qty ? parseInt(qty, 10) : null,
    reason_of_discrepancy,
    corrective_action,
    preventive_action,
    reported_by: reporter.id,
    approved_by: approvedById,
    noted_by: notedById,
    leader: leaderId,
    ncr_id: ncr_id ? parseInt(ncr_id, 10) : null,
    status: 'open',
    site_id: reporter.site_id || null
  }

  const { data, error } = await supabase.from('qddr_reports').insert(payload).select('*').maybeSingle()

  if (error) {
    const customErr = new Error(`Database error creating QDDR: ${error.message}`)
    customErr.status = 500
    throw customErr
  }

  return { data }
}

export async function updateQddrReport({ id, body }) {
  const {
    corrective_action,
    preventive_action,
    approved_by,
    noted_by,
    leader,
    status
  } = body || {}

  const [approvedById, notedById, leaderId] = await Promise.all([
    approved_by ? findUserIdByName(approved_by) : Promise.resolve(null),
    noted_by ? findUserIdByName(noted_by) : Promise.resolve(null),
    leader ? findUserIdByName(leader) : Promise.resolve(null)
  ])

  const updates = {}
  if (corrective_action !== undefined) updates.corrective_action = corrective_action
  if (preventive_action !== undefined) updates.preventive_action = preventive_action
  if (approvedById !== null) updates.approved_by = approvedById
  if (notedById !== null) updates.noted_by = notedById
  if (leaderId !== null) updates.leader = leaderId
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('qddr_reports')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    const customErr = new Error(`Database error updating QDDR: ${error.message}`)
    customErr.status = 500
    throw customErr
  }

  return { data }
}

/**
 * Hard deletes a QDDR report
 */
export async function softDeleteQddrReport({ id, actorAuthId }) {
  const { data, error } = await supabase
    .from('qddr_reports')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error

  try {
    const { writeAudit } = await import('../lib/audit.js')
    await writeAudit({
      level: 'audit',
      source: 'qddr_reports',
      action: 'qddr_soft_delete',
      userAuthId: actorAuthId,
      details: { id, reference_no: data?.reference_no }
    })
  } catch (err) {
    console.warn('Failed to write audit log:', err.message || err)
  }

  return { data }
}

/**
 * Updates a QDDR report fully
 */
export async function editQddrReport({ id, body, actorAuthId }) {
  const payload = {
    location: body.location,
    date: body.date ? body.date : null,
    time: body.time ? body.time : null,
    trucker_broker: body.trucker_broker,
    plate_number: body.plate_number,
    container_number: body.container_number,
    po_reference: body.po_reference,
    drwb_number: body.drwb_number,
    brand_supplier: body.brand_supplier,
    material_description: body.material_description,
    material_code: body.material_code,
    batch_code_su_number: body.batch_code_su_number,
    holes_punctures: Boolean(body.holes_punctures),
    deformed_torn: Boolean(body.deformed_torn),
    open_carton: Boolean(body.open_carton),
    crushed_dented: Boolean(body.crushed_dented),
    wet_leaked: Boolean(body.wet_leaked),
    stain_graffiti: Boolean(body.stain_graffiti),
    bulging: Boolean(body.bulging),
    improper_stretch_wrapping: Boolean(body.improper_stretch_wrapping),
    wrong_no_batchcode: Boolean(body.wrong_no_batchcode),
    opened_seal: Boolean(body.opened_seal),
    no_label_broken_label: Boolean(body.no_label_broken_label),
    short_pack: Boolean(body.short_pack),
    excess_shipment: Boolean(body.excess_shipment),
    documentation_error: Boolean(body.documentation_error),
    picking_discrepancy: Boolean(body.picking_discrepancy),
    others: body.others,
    qty: body.qty ? parseInt(body.qty, 10) : null,
    reason_of_discrepancy: body.reason_of_discrepancy
  }

  const { data, error } = await supabase
    .from('qddr_reports')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error

  try {
    const { writeAudit } = await import('../lib/audit.js')
    await writeAudit({
      level: 'audit',
      source: 'qddr_reports',
      action: 'qddr_update',
      userAuthId: actorAuthId,
      details: { id, reference_no: data?.reference_no }
    })
  } catch (err) {
    console.warn('Failed to write audit log:', err.message || err)
  }

  return { data }
}
