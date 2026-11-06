import { getRequestActor } from '../lib/requestUtils.js'
import logger from '../utils/logger.js'
import { writeAudit } from '../lib/audit.js'
import { isAdminOrSuperAdminRole } from '../utils/roleUtils.js'
import {
  fetchAllRoles,
  fetchRoleById,
  insertRole,
  updateRole,
  updateRolePermissions,
  removeRole,
  auditRoleDelete,
  auditRoleUpdate
} from '../services/roleService.js'

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function getRoles(_req, res) {
  const { data, error } = await fetchAllRoles()

  if (error) return res.status(500).json({ error: error.message })

  return res.json(data ?? [])
}

export async function createRole(req, res) {
  const { roleName, permissions } = req.body ?? {}
  const actorRoleName = req.dbUser?.role_name || ''

  if (!roleName || !String(roleName).trim()) {
    return res.status(400).json({ error: 'Role name is required.' })
  }

  const trimmedRoleName = String(roleName).trim()

  // SEC-07: Non-admins cannot create Administrator roles
  if (isAdminOrSuperAdminRole(trimmedRoleName) && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can create Administrator roles.' })
  }

  const { data, error } = await insertRole(trimmedRoleName, permissions)

  if (error) return res.status(500).json({ error: error.message })

  const userAuthId = getRequestActor(req)
  try {
    await writeAudit({
      source: 'roles',
      action: 'role_create',
      userAuthId,
      details: { role_name: trimmedRoleName }
    })
  } catch (auditErr) {
    logger.warn('Failed to record role_create audit log:', auditErr?.message || auditErr)
  }

  return res.json(data ?? [])
}

export async function deleteRole(req, res) {
  const { id } = req.params

  const { data: existing, error: fetchError } = await fetchRoleById(id)
  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!existing) return res.status(404).json({ error: 'Role not found.' })

  // SEC-07: Built-in Administrator roles cannot be deleted
  if (isAdminOrSuperAdminRole(existing.role_name)) {
    return res.status(403).json({ error: 'System administrator roles cannot be deleted.' })
  }

  const { error } = await removeRole(id)
  if (error) return res.status(500).json({ error: error.message })

  // Fire-and-forget audit — failure must not affect the HTTP response
  const userAuthId = getRequestActor(req)
  auditRoleDelete({ userAuthId, role: existing })

  return res.json({ success: true })
}

export async function putRole(req, res) {
  const { id } = req.params
  const { roleName } = req.body ?? {}
  const actorRoleName = req.dbUser?.role_name || ''

  if (!roleName || !String(roleName).trim()) {
    return res.status(400).json({ error: 'Role name is required.' })
  }

  const { data: existing, error: fetchError } = await fetchRoleById(id)
  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!existing) return res.status(404).json({ error: 'Role not found.' })

  // SEC-07: Non-admins cannot modify existing Administrator roles
  if (isAdminOrSuperAdminRole(existing.role_name) && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can modify Administrator roles.' })
  }

  // SEC-07: Non-admins cannot rename a role to an Administrator role
  const trimmedRoleName = String(roleName).trim()
  if (isAdminOrSuperAdminRole(trimmedRoleName) && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can rename a role to an Administrator role.' })
  }

  const { data, error } = await updateRole(id, trimmedRoleName)
  if (error) return res.status(500).json({ error: error.message })

  const userAuthId = getRequestActor(req)
  auditRoleUpdate({ userAuthId, role: data?.[0] })

  return res.json(data ?? [])
}

export async function putRolePermissions(req, res) {
  const { id } = req.params
  const { permissions } = req.body ?? {}
  const actorRoleName = req.dbUser?.role_name || ''

  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'Permissions object is required.' })
  }

  const { data: existing, error: fetchError } = await fetchRoleById(id)
  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!existing) return res.status(404).json({ error: 'Role not found.' })

  // SEC-07: Non-admins cannot modify Administrator role permissions
  if (isAdminOrSuperAdminRole(existing.role_name) && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can modify Administrator role permissions.' })
  }

  const { data, error } = await updateRolePermissions(id, permissions)
  if (error) return res.status(500).json({ error: error.message })

  const userAuthId = getRequestActor(req)
  auditRoleUpdate({ userAuthId, role: data?.[0] })

  return res.json(data?.[0] ?? data ?? {})
}

export async function putRolePositions(req, res) {
  const { id } = req.params
  const { positionIds } = req.body ?? {}
  const actorAuthId = getRequestActor(req)
  const actorRoleName = req.dbUser?.role_name || ''

  const { data: existing, error: fetchError } = await fetchRoleById(id)
  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!existing) return res.status(404).json({ error: 'Role not found.' })

  // SEC-07: Non-admins cannot modify Administrator role positions
  if (isAdminOrSuperAdminRole(existing.role_name) && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can modify Administrator role positions.' })
  }

  const { assignPositionsToRole } = await import('../services/positionService.js')
  const result = await assignPositionsToRole({ roleId: Number(id), positionIds: positionIds || [], actorAuthId })

  if (result.error) return res.status(500).json({ error: result.error.message || result.error })
  return res.json({ success: true })
}
