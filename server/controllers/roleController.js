import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'
import { getRequestActor } from '../lib/requestUtils.js'

export async function getRoles(_req, res) {
  const { data, error } = await supabase
    .from('roles')
    .select('id, role_name')
    .order('role_name', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function createRole(req, res) {
  const { roleName } = req.body || {}
  if (!roleName) {
    return res.status(400).json({ error: 'Role name is required.' })
  }

  const { data, error } = await supabase
    .from('roles')
    .insert([{ role_name: roleName }])
    .select('id, role_name')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function deleteRole(req, res) {
  const { id } = req.params
  // fetch record for details
  const { data: existing, error: fetchError } = await supabase
    .from('roles')
    .select('id, role_name')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message })
  }

  const { error } = await supabase.from('roles').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // record audit log (non-blocking)
  try {
    const userAuthId = getRequestActor(req)
    await writeAudit({ source: 'roles', action: 'role_delete', userAuthId, details: { id: existing?.id ?? id, role_name: existing?.role_name || null } })
  } catch (logErr) {
    console.warn('Failed to record role_delete log:', logErr?.message || logErr)
  }

  return res.json({ success: true })
}