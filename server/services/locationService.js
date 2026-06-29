import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

export async function fetchAllLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('id, location_name')
    .order('location_name', { ascending: true })

  return { data: data ?? [], error }
}

export async function createLocation({ locationName, actorAuthId }) {
  if (!locationName?.trim()) {
    return { data: null, error: null, validationError: 'Location name is required.' }
  }

  const { data: existing, error: lookupError } = await supabase
    .from('locations')
    .select('id, location_name')
    .ilike('location_name', locationName.trim())
    .maybeSingle()

  if (lookupError) return { data: null, error: lookupError }
  if (existing) return { data: existing, error: null, existed: true }

  const { data, error } = await supabase
    .from('locations')
    .insert([{ location_name: locationName.trim() }])
    .select('id, location_name')
    .maybeSingle()

  if (error) return { data: null, error }

  try {
    await writeAudit({
      level: 'audit',
      source: 'locations',
      action: 'location_create',
      userAuthId: actorAuthId,
      details: { id: data?.id ?? null, location_name: locationName.trim() }
    })
  } catch (auditError) {
    console.warn('Failed to record location_create audit:', auditError?.message || auditError)
  }

  return { data, error: null }
}

export async function deleteLocation({ id, actorAuthId }) {
  const { data: existing, error: lookupError } = await supabase
    .from('locations')
    .select('id, location_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) return { success: false, error: lookupError }
  if (!existing) return { success: false, notFound: true }

  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) return { success: false, error }

  try {
    await writeAudit({
      level: 'audit',
      source: 'locations',
      action: 'location_delete',
      userAuthId: actorAuthId,
      details: { id: existing.id, location_name: existing.location_name || null }
    })
  } catch (auditError) {
    console.warn('Failed to record location_delete audit:', auditError?.message || auditError)
  }

  return { success: true, error: null }
}

export async function updateLocation({ id, location_name, actorAuthId }) {
  if (!location_name?.trim()) {
    return { data: null, error: null, validationError: 'Location name is required.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('locations')
    .select('id, location_name')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError }
  if (!existing) return { notFound: true }

  const { data, error } = await supabase
    .from('locations')
    .update({ location_name: location_name.trim() })
    .eq('id', id)
    .select('id, location_name')
    .maybeSingle()

  if (error) return { data: null, error, validationError: null }

  try {
    await writeAudit({
      level: 'audit',
      source: 'locations',
      action: 'location_update',
      userAuthId: actorAuthId,
      details: { id: data?.id ?? null, location_name: location_name.trim() }
    })
  } catch (auditError) {
    console.warn('Failed to record location_update audit:', auditError?.message || auditError)
  }

  return { data, error: null }
}