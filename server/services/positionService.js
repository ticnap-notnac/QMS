import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

export async function fetchAllPositions() {
  const { data, error } = await supabase
    .from('positions')
    .select('id, position_name, role_id')
    .order('position_name', { ascending: true })

  if (error) return { data: null, error }
  return { data: data || [], error: null }
}

export async function createPosition({ positionName, actorAuthId }) {
  const name = String(positionName || '').trim()
  if (!name) {
    return { data: null, error: null, validationError: 'Position name is required.' }
  }

  const { data: existing, error: lookupError } = await supabase
    .from('positions')
    .select('id, position_name, role_id')
    .ilike('position_name', name)
    .maybeSingle()

  if (lookupError) return { data: null, error: lookupError }
  if (existing) {
    return { data: existing, error: null, existed: true }
  }

  const { data, error } = await supabase
    .from('positions')
    .insert([{ position_name: name }])
    .select('id, position_name, role_id')
    .maybeSingle()

  if (error) return { data: null, error }

  try {
    await writeAudit({
      level: 'audit',
      source: 'positions',
      action: 'position_create',
      userAuthId: actorAuthId,
      details: { id: data.id, position_name: data.position_name }
    })
  } catch (auditError) {
    console.warn('Failed to record position_create audit:', auditError?.message || auditError)
  }

  return { data, error: null }
}

export async function deletePosition({ id, actorAuthId }) {
  const { data: existing, error: lookupError } = await supabase
    .from('positions')
    .select('id, position_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) return { success: false, error: lookupError }
  if (!existing) return { success: false, notFound: true }

  const { error } = await supabase.from('positions').delete().eq('id', id)
  if (error) return { success: false, error }

  try {
    await writeAudit({
      level: 'audit',
      source: 'positions',
      action: 'position_delete',
      userAuthId: actorAuthId,
      details: { id: existing.id, position_name: existing.position_name }
    })
  } catch (auditError) {
    console.warn('Failed to record position_delete audit:', auditError?.message || auditError)
  }

  return { success: true, error: null }
}

export async function updatePosition({ id, position_name, actorAuthId }) {
  const name = String(position_name || '').trim()
  if (!name) {
    return { data: null, error: null, validationError: 'Position name is required.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('positions')
    .select('id, position_name')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError }
  if (!existing) return { notFound: true }

  const { data, error } = await supabase
    .from('positions')
    .update({ position_name: name })
    .eq('id', id)
    .select('id, position_name, role_id')
    .maybeSingle()

  if (error) return { data: null, error, validationError: null }

  try {
    await writeAudit({
      level: 'audit',
      source: 'positions',
      action: 'position_update',
      userAuthId: actorAuthId,
      details: { id: data.id, position_name: data.position_name }
    })
  } catch (auditError) {
    console.warn('Failed to record position_update audit:', auditError?.message || auditError)
  }

  return { data, error: null }
}

export async function assignPositionsToRole({ roleId, positionIds = [], actorAuthId }) {
  // First clear role_id for all positions currently linked to this role
  const { error: clearError } = await supabase
    .from('positions')
    .update({ role_id: null })
    .eq('role_id', roleId)

  if (clearError) return { success: false, error: clearError }

  if (positionIds.length > 0) {
    const { error: updateError } = await supabase
      .from('positions')
      .update({ role_id: roleId })
      .in('id', positionIds)

    if (updateError) return { success: false, error: updateError }
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'roles',
      action: 'role_positions_update',
      userAuthId: actorAuthId,
      details: { roleId, positionIds }
    })
  } catch (auditError) {
    console.warn('Failed to record role_positions_update audit:', auditError?.message || auditError)
  }

  return { success: true, error: null }
}
