import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'
import { getRequestActor } from '../lib/requestUtils.js'

function normalizeLocationName(value) {
  return String(value || '').trim()
}

export async function getLocations(_req, res) {
  const { data, error } = await supabase
    .from('locations')
    .select('id, location_name')
    .order('location_name', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function createLocation(req, res) {
  const locationName = normalizeLocationName(req.body?.locationName || req.body?.location_name)

  if (!locationName) {
    return res.status(400).json({ error: 'Location name is required.' })
  }

  const { data: existing, error: lookupError } = await supabase
    .from('locations')
    .select('id, location_name')
    .ilike('location_name', locationName)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (existing) {
    return res.status(200).json(existing)
  }

  const { data, error } = await supabase
    .from('locations')
    .insert([{ location_name: locationName }])
    .select('id, location_name')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'locations',
      action: 'location_create',
      userAuthId: getRequestActor(req),
      details: { id: data?.id ?? null, location_name: data?.location_name || locationName },
    })
  } catch (auditError) {
    console.warn('Failed to record location_create audit:', auditError?.message || auditError)
  }

  return res.status(201).json(data)
}

export async function deleteLocation(req, res) {
  const { id } = req.params

  const { data: existing, error: lookupError } = await supabase
    .from('locations')
    .select('id, location_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'Location not found.' })
  }

  const { error } = await supabase.from('locations').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'locations',
      action: 'location_delete',
      userAuthId: getRequestActor(req),
      details: { id: existing.id, location_name: existing.location_name || null },
    })
  } catch (auditError) {
    console.warn('Failed to record location_delete audit:', auditError?.message || auditError)
  }

  return res.json({ success: true })
}
