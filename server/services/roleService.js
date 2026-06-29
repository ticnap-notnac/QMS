import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

// ─── Queries ─────────────────────────────────────────────────────────────────
export async function fetchAllRoles() {
  return supabase
    .from('roles')
    .select('id, role_name')
    .order('role_name', { ascending: true })
}

export async function fetchRoleById(id) {
  return supabase
    .from('roles')
    .select('id, role_name')
    .eq('id', id)
    .maybeSingle()
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export async function insertRole(roleName) {
  return supabase
    .from('roles')
    .insert([{ role_name: roleName }])
    .select('id, role_name')
}

export async function removeRole(id) {
  return supabase.from('roles').delete().eq('id', id)
}

export async function updateRole(id, roleName) {
  return supabase
    .from('roles')
    .update({ role_name: roleName })
    .eq('id', id)
    .select('id, role_name')
}

// ─── Audit ────────────────────────────────────────────────────────────────────
export async function auditRoleDelete({ userAuthId, role }) {
  try {
    await writeAudit({
      source: 'roles',
      action: 'role_delete',
      userAuthId,
      details: {
        id: role?.id,
        role_name: role?.role_name ?? null,
      },
    })
  } catch (logErr) {
    console.warn('Failed to record role_delete log:', logErr?.message ?? logErr)
  }
}

export async function auditRoleUpdate({ userAuthId, role }) {
  try {
    await writeAudit({
      source: 'roles',
      action: 'role_update',
      userAuthId,
      details: {
        id: role?.id,
        role_name: role?.role_name ?? null,
      },
    })
  } catch (logErr) {
    console.warn('Failed to record role_update log:', logErr?.message ?? logErr)
  }
}