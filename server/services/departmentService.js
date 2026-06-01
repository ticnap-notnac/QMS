import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

// Read---------------------------------------------------------------------------

export async function fetchAllDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('id, department_name')
    .order('department_name', { ascending: true })

  return { data: data ?? [], error }
}

// Create---------------------------------------------------------------------------
export async function createDepartment({ departmentName, actorAuthId }) {
  if (!departmentName?.trim()) {
    return { data: null, error: null, validationError: 'Department name is required.' }
  }

  const { data, error } = await supabase
    .from('departments')
    .insert([{ department_name: departmentName }])
    .select('id, department_name')

  if (error) return { data: null, error, validationError: null }

  await _auditSafe({
    action: 'department_create',
    actorAuthId,
    details: { id: data?.[0]?.id ?? null, department_name: data?.[0]?.department_name ?? departmentName },
  })

  return { data: data ?? [], error: null, validationError: null }
}


// Delete---------------------------------------------------------------------------
export async function deleteDepartment({ id, actorAuthId }) {
  // Fetch for audit details only — not a gate
  const { data: existing, error: fetchError } = await supabase
    .from('departments')
    .select('id, department_name')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError }

  const { error } = await supabase.from('departments').delete().eq('id', id)

  if (error) return { success: false, error }

  await _auditSafe({
    action: 'department_delete',
    actorAuthId,
    details: { id: existing?.id ?? id, department_name: existing?.department_name ?? null },
  })

  return { success: true, error: null }
}

// Internal---------------------------------------------------------------------------
async function _auditSafe({ action, actorAuthId, details }) {
  try {
    await writeAudit({
      level: 'audit',
      source: 'departments',
      action,
      userAuthId: actorAuthId,
      details,
    })
  } catch (err) {
    console.warn(`[DepartmentService] Failed to record ${action} audit:`, err?.message ?? err)
  }
}