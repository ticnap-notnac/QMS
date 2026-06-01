import { getRequestActor } from '../lib/requestUtils.js'
import {
  fetchAllDepartments,
  createDepartment,
  deleteDepartment,
} from '../services/departmentService.js'

// GET /departments
export async function getDepartments(_req, res) {
  const { data, error } = await fetchAllDepartments()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
}

// POST /departments
export async function postDepartment(req, res) {
  const { departmentName } = req.body ?? {}
  const actorAuthId = getRequestActor(req)

  const { data, error, validationError } = await createDepartment({ departmentName, actorAuthId })

  if (validationError) return res.status(400).json({ error: validationError })
  if (error)           return res.status(500).json({ error: error.message })

  return res.json(data)
}

// DELETE /departments/:id
export async function removeDepartment(req, res) {
  const { id } = req.params
  const actorAuthId = getRequestActor(req)

  const { success, error } = await deleteDepartment({ id, actorAuthId })

  if (error)   return res.status(500).json({ error: error.message })
  if (success) return res.json({ success: true })
}