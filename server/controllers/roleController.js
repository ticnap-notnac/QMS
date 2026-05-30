import { supabase } from '../lib/supabase.js'

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

  // try to record audit log (non-blocking)
  try {
    const userAuthId = req.body?.userAuthId || req.headers['x-user-auth-id'] || req.query?.userAuthId || null
    await supabase.from('system_logs').insert([{ level: 'audit', source: 'roles', action: 'role_delete', user_auth_id: userAuthId, details: { id: existing?.id ?? id, role_name: existing?.role_name || null } }])
  } catch (logErr) {
    // don't fail the request on logging error
    console.warn('Failed to record role_delete log:', logErr?.message || logErr)
  }

  return res.json({ success: true })
}