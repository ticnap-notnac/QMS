import { getRequestActor } from '../lib/requestUtils.js'
import {
  fetchAllRoles,
  fetchRoleById,
  insertRole,
  removeRole,
  auditRoleDelete,
} from '../services/roleService.js'

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function getRoles(_req, res) {
  const { data, error } = await fetchAllRoles()

  if (error) return res.status(500).json({ error: error.message })

  return res.json(data ?? [])
}

export async function createRole(req, res) {
  const { roleName } = req.body ?? {}

  if (!roleName) {
    return res.status(400).json({ error: 'Role name is required.' })
  }

  const { data, error } = await insertRole(roleName)

  if (error) return res.status(500).json({ error: error.message })

  return res.json(data ?? [])
}

export async function deleteRole(req, res) {
  const { id } = req.params

  const { data: existing, error: fetchError } = await fetchRoleById(id)
  if (fetchError) return res.status(500).json({ error: fetchError.message })

  const { error } = await removeRole(id)
  if (error) return res.status(500).json({ error: error.message })

  // Fire-and-forget audit — failure must not affect the HTTP response
  const userAuthId = getRequestActor(req)
  auditRoleDelete({ userAuthId, role: existing })

  return res.json({ success: true })
}