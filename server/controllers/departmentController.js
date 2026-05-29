import { supabase } from '../lib/supabase.js'

export async function getDepartments(_req, res) {
  const { data, error } = await supabase
    .from('departments')
    .select('id, department_name')
    .order('department_name', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function createDepartment(req, res) {
  const { departmentName } = req.body || {}
  if (!departmentName) {
    return res.status(400).json({ error: 'Department name is required.' })
  }

  const { data, error } = await supabase
    .from('departments')
    .insert([{ department_name: departmentName }])
    .select('id, department_name')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function deleteDepartment(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('departments').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ success: true })
}