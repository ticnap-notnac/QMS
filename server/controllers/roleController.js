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
  const { error } = await supabase.from('roles').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ success: true })
}