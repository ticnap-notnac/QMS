import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'
import { getRequestActor } from '../lib/requestUtils.js'

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
  // fetch record for details
  const { data: existing, error: fetchError } = await supabase
    .from('departments')
    .select('id, department_name')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message })
  }

  const { error } = await supabase.from('departments').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // record audit log (non-blocking)
  try {
    const userAuthId = getRequestActor(req)
    await writeAudit({ source: 'departments', action: 'department_delete', userAuthId, details: { id: existing?.id ?? id, department_name: existing?.department_name || null } })
  } catch (logErr) {
    console.warn('Failed to record department_delete log:', logErr?.message || logErr)
  }

  return res.json({ success: true })
}