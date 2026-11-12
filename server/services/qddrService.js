import { supabase } from '../lib/supabase.js'
import { resolveEffectivePermissions } from '../middlewares/roleMiddleware.js'
import logger from '../utils/logger.js'
import { sendQddrClosedEmail } from './emailService.js'

function isAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
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

async function getCallerQddrProfile(actorAuthId) {
  if (!actorAuthId) return null
  const { data: user } = await supabase
    .from('users')
    .select('id, auth_id, site_id, role_id, position_id')
    .eq('auth_id', actorAuthId)
    .maybeSingle()

  if (!user) return null

  let effectiveRoleId = user.role_id
  if (!effectiveRoleId && user.position_id) {
    const { data: pos } = await supabase
      .from('positions')
      .select('role_id')
      .eq('id', user.position_id)
      .maybeSingle()
    effectiveRoleId = pos?.role_id || null
  }

  let roleName = ''
  let rawPermissions = null
  if (effectiveRoleId) {
    const { data: role } = await supabase
      .from('roles')
      .select('role_name, permissions')
      .eq('id', effectiveRoleId)
      .maybeSingle()
    roleName = role?.role_name || ''
    rawPermissions = role?.permissions || null
  }

  const effectivePerms = resolveEffectivePermissions(roleName, rawPermissions)
  return {
    id: user.id,
    auth_id: user.auth_id,
    site_id: user.site_id || null,
    role_name: roleName,
    rights: Array.isArray(effectivePerms?.rights) ? effectivePerms.rights : []
  }
}

function buildQddrReferenceNumber(recordsOrLatestRef) {
  if (Array.isArray(recordsOrLatestRef)) {
    let maxSeq = 0
    for (const r of recordsOrLatestRef) {
      const match = String(r?.reference_no || '').match(/^QDDR-(\d+)$/i)
      if (match) {
        const seq = parseInt(match[1], 10)
        if (seq > maxSeq) maxSeq = seq
      }
    }
    return maxSeq
  }
  const match = String(recordsOrLatestRef || '').match(/^QDDR-(\d+)$/i)
  if (!match) return 0
  return Number(match[1]) || 0
}

export async function findUserIdByName(name) {
  if (name === null || name === undefined || String(name).trim() === '') return null

  const trimmed = String(name).trim()
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  // SearchableDropdown labels look like "Name — Role" or "Name - Role"
  const cleanName = trimmed.split(/\s*[—–-]\s*/)[0].trim()
  if (!cleanName) return null

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .ilike('user_name', cleanName)
    .limit(1)
    .maybeSingle()

  if (!error && data?.id) {
    return data.id
  }

  // Fallback: match against first_name + last_name or user_name case-insensitively
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, user_name, first_name, last_name')

  const lowerTarget = cleanName.toLowerCase()
  const matched = (allUsers || []).find((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase()
    const userName = String(u.user_name || '').trim().toLowerCase()
    return fullName === lowerTarget || userName === lowerTarget
  })

  return matched?.id || null
}

/**
 * Creates a new QDDR report.
 * @param {Object} params - The parameters for creating a QDDR report.
 * @param {Object} params.body - The report data payload.
 * @param {string} params.reportedByAuthId - The auth ID of the user creating the report.
 * @returns {Promise<{data: Object}>} The created QDDR report data.
 */
export async function createQddrReport({ body, reportedByAuthId }) {
  const { data: reporter, error: reporterError } = await supabase
    .from('users')
    .select('id, site_id')
    .eq('auth_id', reportedByAuthId)
    .maybeSingle()

  if (reporterError) throw reporterError
  if (!reporter) throw Object.assign(new Error('Reporter profile not found.'), { status: 404 })

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
    clause_ids,
    audit_schedule_id
  } = body || {}

  const [approvedById, notedById, leaderId] = await Promise.all([
    findUserIdByName(approved_by),
    findUserIdByName(noted_by),
    findUserIdByName(leader)
  ])

  const getNextRef = async () => {
    if (typeof supabase.rpc === 'function') {
      const { data: rpcRef, error: rpcErr } = await supabase.rpc('next_report_reference', {
        p_type: 'QDDR',
      })
      if (!rpcErr && rpcRef) return rpcRef
    }

    const { data: records, error: latestError } = await supabase
      .from('qddr_reports')
      .select('reference_no')
      .ilike('reference_no', 'QDDR-%')
      .order('id', { ascending: false })
      .limit(1000)

    if (latestError) {
      const customErr = new Error(`Database error getting latest QDDR ref: ${latestError.message}`)
      customErr.status = 500
      throw customErr
    }

    const maxSeq = buildQddrReferenceNumber(records || [])
    return `QDDR-${String(maxSeq + 1).padStart(3, '0')}`
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
      audit_schedule_id: audit_schedule_id || null,
      status: 'open',
      site_id: reporter.site_id || null
    }

    const res = await supabase.from('qddr_reports').insert(payload).select('*').maybeSingle()
    if (!res.error) {
      data = res.data
      error = null
      break
    }
    error = res.error
    if (res.error.code !== '23505') break
  }

  if (error) {
    const customErr = new Error(`Database error creating QDDR: ${error.message}`)
    customErr.status = 500
    throw customErr
  }

  if (data?.id && Array.isArray(clause_ids) && clause_ids.length > 0) {
    const linkRows = clause_ids
      .map(cid => String(cid).trim())
      .filter(cid => cid.length > 0)
      .map(cid => ({ qddr_report_id: data.id, clause_id: cid }))

    if (linkRows.length > 0) {
      const { error: linkError } = await supabase
        .from('qddr_clause_links')
        .insert(linkRows)

      if (linkError) {
        console.warn('[qddrService] Failed to insert qddr_clause_links:', linkError.message)
      }
    }
  }

  if (data?.id) {
    import('./trendClusteringService.js').then(m => {
      m.analyzeAndClusterQddrReportInBackground(data.id)
    }).catch(err => {
      console.warn('[qddrService] Failed to trigger QDDR trend clustering:', err.message)
    })
  }

  return { data }
}

/**
 * Automatically notifies all active Inventory Manager users via in-app notification and email when a QDDR is closed.
 * @param {Object} qddr - The closed QDDR report record.
 */
export async function notifyInventoryManagersOnQddrClosed(qddr) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, user_name, status, roles(role_name), positions(position_name)')

    if (error) {
      logger.error('[qddrService] Failed to fetch users for Inventory Manager notifications:', error)
      return
    }

    const inventoryManagers = (users || []).filter((user) => {
      if (user.status && String(user.status).toUpperCase() === 'INACTIVE') return false
      const roleName = String(user.roles?.role_name || '').trim().toLowerCase()
      const positionName = String(user.positions?.position_name || '').trim().toLowerCase()
      return roleName === 'inventory manager' || positionName === 'inventory manager'
    })

    if (inventoryManagers.length === 0) {
      logger.info('[qddrService] No active Inventory Manager users found to notify for closed QDDR.')
      return
    }

    const refNo = qddr.reference_no || `QDDR #${qddr.id}`
    const title = `QDDR Closed: ${refNo}`
    const message = `Heads up: Quality Defect & Deviation Report ${refNo} has been closed. Please check the system to review the new document.`

    // In-app notifications
    const notificationRows = inventoryManagers.map((im) => ({
      user_id: im.id,
      title,
      message,
      type: 'info',
      is_read: false,
    }))

    const { error: notifError } = await supabase.from('notifications').insert(notificationRows)
    if (notifError) {
      logger.warn('[qddrService] Failed to insert in-app notifications for Inventory Managers:', notifError.message)
    }

    // Email dispatch via SMTP
    for (const im of inventoryManagers) {
      if (!im.email) continue
      const displayName = `${im.first_name || ''} ${im.last_name || ''}`.trim() || im.user_name || 'Inventory Manager'
      await sendQddrClosedEmail({
        toEmail: im.email,
        qddr,
        displayName,
      }).catch((emailErr) => {
        logger.error(`[qddrService] Failed to send QDDR closed email to ${im.email}:`, emailErr.message)
      })
    }

    logger.info(`[qddrService] Successfully notified ${inventoryManagers.length} Inventory Manager(s) for closed QDDR ${refNo}.`)
  } catch (err) {
    logger.error('[qddrService] Error in notifyInventoryManagersOnQddrClosed:', err.message)
  }
}

/**
 * Updates specific fields of an existing QDDR report.
 * @param {Object} params - The parameters for updating a QDDR report.
 * @param {number|string} params.id - The ID of the QDDR report.
 * @param {Object} params.body - The fields to update.
 * @returns {Promise<{data: Object}>} The updated QDDR report data.
 */
export async function updateQddrReport({ id, body, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('qddr_reports')
    .select('id, reference_no, status, reported_by, leader, approved_by, noted_by, site_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('QDDR report not found')
    err.status = 404
    throw err
  }

  const caller = await getCallerQddrProfile(actorAuthId)
  if (caller && !isAdminRole(caller.role_name) && caller.site_id && existing.site_id && String(caller.site_id) !== String(existing.site_id)) {
    const err = new Error('You can only update QDDRs belonging to your assigned site.')
    err.status = 403
    throw err
  }

  const {
    material_description,
    reason_of_discrepancy,
    corrective_action,
    preventive_action,
    approved_by,
    noted_by,
    leader,
    status
  } = body || {}

  const requestedStatus = status !== undefined ? String(status || '').trim().toLowerCase() : undefined
  const currentStatus = String(existing.status || 'open').trim().toLowerCase()

  if (requestedStatus === 'closed' && currentStatus !== 'closed' && caller) {
    const normalizedRole = String(caller.role_name || '').trim().toLowerCase()
    const canCloseQddr =
      isAdminRole(caller.role_name) ||
      ['qa officer', 'auditor', 'quality assurance', 'department manager'].includes(normalizedRole) ||
      caller.rights.includes('accept_decline_report')

    if (!canCloseQddr) {
      const err = new Error('Only authorized reviewers (QA Officer, Auditor, Department Manager, or Admin) can close a QDDR report.')
      err.status = 403
      throw err
    }
  }

  const [approvedById, notedById, leaderId] = await Promise.all([
    approved_by !== undefined ? findUserIdByName(approved_by) : Promise.resolve(undefined),
    noted_by !== undefined ? findUserIdByName(noted_by) : Promise.resolve(undefined),
    leader !== undefined ? findUserIdByName(leader) : Promise.resolve(undefined)
  ])

  const updates = {}
  if (material_description !== undefined) updates.material_description = material_description
  if (reason_of_discrepancy !== undefined) updates.reason_of_discrepancy = reason_of_discrepancy
  if (corrective_action !== undefined) updates.corrective_action = corrective_action
  if (preventive_action !== undefined) updates.preventive_action = preventive_action
  if (approved_by !== undefined) updates.approved_by = approvedById
  if (noted_by !== undefined) updates.noted_by = notedById
  if (leader !== undefined) updates.leader = leaderId
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

  if (requestedStatus === 'closed' && currentStatus !== 'closed' && data) {
    notifyInventoryManagersOnQddrClosed(data).catch((notifyErr) => {
      logger.error('[qddrService] Failed to notify inventory managers on QDDR closed:', notifyErr.message)
    })
    autoPromoteQddrToCaseRepository(data).catch((promoteErr) => {
      logger.warn('[qddrService] Failed to auto-promote QDDR to case repository:', promoteErr.message)
    })
  }

  return { data }
}

/**
 * Deletes a QDDR report and its associated clause links.
 * @param {Object} params - The parameters for deleting a QDDR report.
 * @param {number|string} params.id - The ID of the QDDR report to delete.
 * @param {string} params.actorAuthId - The auth ID of the user performing the deletion.
 * @returns {Promise<{data: Object}>} The deleted QDDR report data.
 */
export async function softDeleteQddrReport({ id, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('qddr_reports')
    .select('id, site_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('QDDR report not found')
    err.status = 404
    throw err
  }

  const caller = await getCallerQddrProfile(actorAuthId)
  if (caller && !isAdminRole(caller.role_name) && caller.site_id && existing.site_id && String(caller.site_id) !== String(existing.site_id)) {
    const err = new Error('You can only delete QDDRs belonging to your assigned site.')
    err.status = 403
    throw err
  }

  await supabase.from('qddr_clause_links').delete().eq('qddr_report_id', id)

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
 * Fully edits an existing QDDR report and its clause links (supports partial updates).
 * @param {Object} params - The parameters for editing a QDDR report.
 * @param {number|string} params.id - The ID of the QDDR report.
 * @param {Object} params.body - The report data payload.
 * @param {string} params.actorAuthId - The auth ID of the user performing the edit.
 * @returns {Promise<{data: Object}>} The updated QDDR report data.
 */
export async function editQddrReport({ id, body = {}, actorAuthId }) {
  const { data: existing, error: findError } = await supabase
    .from('qddr_reports')
    .select('id, site_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) throw findError
  if (!existing) {
    const err = new Error('QDDR report not found')
    err.status = 404
    throw err
  }

  const caller = await getCallerQddrProfile(actorAuthId)
  if (caller && !isAdminRole(caller.role_name) && caller.site_id && existing.site_id && String(caller.site_id) !== String(existing.site_id)) {
    const err = new Error('You can only edit QDDRs belonging to your assigned site.')
    err.status = 403
    throw err
  }

  const payload = {}

  const stringKeys = [
    'location',
    'trucker_broker',
    'plate_number',
    'container_number',
    'po_reference',
    'drwb_number',
    'brand_supplier',
    'material_description',
    'material_code',
    'batch_code_su_number',
    'others',
    'reason_of_discrepancy',
    'corrective_action',
    'preventive_action',
  ]

  for (const key of stringKeys) {
    if (body[key] !== undefined) {
      payload[key] = body[key]
    }
  }

  if (body.date !== undefined) {
    payload.date = body.date ? body.date : null
  }
  if (body.time !== undefined) {
    payload.time = body.time ? body.time : null
  }
  if (body.qty !== undefined) {
    payload.qty = body.qty ? parseInt(body.qty, 10) : null
  }

  const booleanKeys = [
    'holes_punctures',
    'deformed_torn',
    'open_carton',
    'crushed_dented',
    'wet_leaked',
    'stain_graffiti',
    'bulging',
    'improper_stretch_wrapping',
    'wrong_no_batchcode',
    'opened_seal',
    'no_label_broken_label',
    'short_pack',
    'excess_shipment',
    'documentation_error',
    'picking_discrepancy',
  ]

  for (const key of booleanKeys) {
    if (body[key] !== undefined) {
      payload[key] = Boolean(body[key])
    }
  }

  const [approvedById, notedById, leaderId] = await Promise.all([
    body.approved_by !== undefined ? findUserIdByName(body.approved_by) : Promise.resolve(undefined),
    body.noted_by !== undefined ? findUserIdByName(body.noted_by) : Promise.resolve(undefined),
    body.leader !== undefined ? findUserIdByName(body.leader) : Promise.resolve(undefined),
  ])

  if (body.approved_by !== undefined) payload.approved_by = approvedById
  if (body.noted_by !== undefined) payload.noted_by = notedById
  if (body.leader !== undefined) payload.leader = leaderId

  let data = null
  if (Object.keys(payload).length > 0) {
    const { data: updated, error } = await supabase
      .from('qddr_reports')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw error
    data = updated
  } else {
    const { data: current } = await supabase
      .from('qddr_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    data = current
  }

  const { clause_ids } = body || {}
  if (Array.isArray(clause_ids)) {
    await supabase.from('qddr_clause_links').delete().eq('qddr_report_id', id)

    const linkRows = clause_ids
      .map(cid => String(cid).trim())
      .filter(cid => cid.length > 0)
      .map(cid => ({ qddr_report_id: id, clause_id: cid }))

    if (linkRows.length > 0) {
      const { error: linkError } = await supabase
        .from('qddr_clause_links')
        .insert(linkRows)

      if (linkError) {
        console.warn('[qddrService] Failed to insert qddr_clause_links during update:', linkError.message)
      }
    }
  }

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

  if (data && String(data.status || '').toLowerCase() === 'closed') {
    autoPromoteQddrToCaseRepository(data).catch((promoteErr) => {
      logger.warn('[qddrService] Failed to auto-promote QDDR to case repository on edit:', promoteErr.message)
    })
  }

  return { data }
}

/**
 * Automatically promotes a closed QDDR report into the `qddr_case_repository`
 * for Case-Based Reasoning (CBR) retrieval and vector similarity search.
 *
 * @param {Object} qddr - The closed QDDR report record.
 */
export async function autoPromoteQddrToCaseRepository(qddr) {
  if (!qddr || !qddr.id) return null
  const discrepancy = String(qddr.reason_of_discrepancy || '').trim()
  if (!discrepancy) return null

  try {
    const apiKey = process.env.GEMINI_API_KEY
    let embedding = null
    if (apiKey) {
      const { generateEmbedding } = await import('../utils/cbr.js')
      embedding = await generateEmbedding(discrepancy, apiKey)
    }

    const defectCategories = []
    const boolKeys = [
      'holes_punctures', 'deformed_torn', 'open_carton', 'crushed_dented',
      'wet_leaked', 'stain_graffiti', 'bulging', 'improper_stretch_wrapping',
      'wrong_no_batchcode', 'opened_seal', 'no_label_broken_label',
      'short_pack', 'excess_shipment', 'documentation_error', 'picking_discrepancy'
    ]
    for (const k of boolKeys) {
      if (qddr[k]) defectCategories.push(k)
    }

    const record = {
      qddr_id: qddr.id,
      reference_no: qddr.reference_no,
      reason_of_discrepancy: discrepancy,
      material_description: qddr.material_description || null,
      defect_categories: defectCategories,
      corrective_action: qddr.corrective_action || 'Approved for disposal',
      preventive_action: qddr.preventive_action || null,
      disposal_approved: true,
      effectiveness_score: 1.0,
      embedding: embedding ? `[${embedding.join(',')}]` : null
    }

    const { data: existing } = await supabase
      .from('qddr_case_repository')
      .select('id')
      .eq('qddr_id', qddr.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('qddr_case_repository')
        .update(record)
        .eq('id', existing.id)
    } else {
      await supabase
        .from('qddr_case_repository')
        .insert([record])
    }
  } catch (err) {
    logger.warn('[qddrService] autoPromoteQddrToCaseRepository warning:', err.message)
  }
}
