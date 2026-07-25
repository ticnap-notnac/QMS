import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

// ─── Queries ─────────────────────────────────────────────────────────────────
export async function fetchAllRoles() {
  return supabase
    .from('roles')
    .select('id, role_name, permissions')
    .order('role_name', { ascending: true })
}

export async function fetchRoleById(id) {
  return supabase
    .from('roles')
    .select('id, role_name, permissions')
    .eq('id', id)
    .maybeSingle()
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export async function insertRole(roleName, permissions = null) {
  const payload = { role_name: roleName }
  if (permissions) payload.permissions = permissions
  return supabase
    .from('roles')
    .insert([payload])
    .select('id, role_name, permissions')
}

export async function removeRole(id) {
  return supabase.from('roles').delete().eq('id', id)
}

export async function updateRole(id, roleName) {
  return supabase
    .from('roles')
    .update({ role_name: roleName })
    .eq('id', id)
    .select('id, role_name, permissions')
}

export async function updateRolePermissions(id, permissions) {
  return supabase
    .from('roles')
    .update({ permissions })
    .eq('id', id)
    .select('id, role_name, permissions')
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
        permissions: role?.permissions ?? null,
      },
    })
  } catch (logErr) {
    console.warn('Failed to record role_update log:', logErr?.message ?? logErr)
  }
}