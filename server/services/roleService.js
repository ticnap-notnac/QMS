import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

// ─── Queries ─────────────────────────────────────────────────────────────────
export async function fetchAllRoles() {
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, role_name, permissions')
    .order('role_name', { ascending: true })

  if (rolesError) return { data: null, error: rolesError }

  const { data: positions, error: posError } = await supabase
    .from('positions')
    .select('id, position_name, role_id')

  const posMap = new Map()
  if (positions) {
    for (const p of positions) {
      if (p.role_id) {
        const key = String(p.role_id)
        if (!posMap.has(key)) posMap.set(key, [])
        posMap.get(key).push({ id: p.id, position_name: p.position_name })
      }
    }
  }

  const enriched = (roles || []).map((r) => ({
    ...r,
    positions: posMap.get(String(r.id)) || []
  }))

  return { data: enriched, error: null }
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