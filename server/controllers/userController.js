import { getRequestActor } from '../lib/requestUtils.js'
import {
  fetchAllUsers,
  createUserWithAuth,
  deleteUserById,
  updateUserById,
  updateUserStatusById, 
} from '../services/userService.js'

export async function getUsers(_req, res) {
  const { data, error } = await fetchAllUsers()
  if (error) return res.status(500).json({ error })
  return res.json(data)
}

export async function createUser(req, res) {
  const { firstName, lastName, email, password, userName, contactNumber, roleId, departmentId } = req.body || {}

  if (!firstName || !lastName || !email || !password || !userName || !departmentId) {
    return res.status(400).json({ error: 'First name, last name, email, password, username, and department are required.' })
  }

  const { authUser, profile, error, status } = await createUserWithAuth({
    firstName, lastName, email, password, userName, contactNumber, roleId, departmentId,
  })

  if (error) return res.status(status).json({ error })
  return res.json({ authUser, profile })
}

export async function deleteUser(req, res) {
  const { id } = req.params
  const actorAuthId = getRequestActor(req)

  const { success, error, status } = await deleteUserById(id, actorAuthId)
  if (!success) return res.status(status).json({ error })
  return res.json({ success })
}

export async function updateUser(req, res) {
  const { id } = req.params
  const actorAuthId = getRequestActor(req)

  const { profile, error, status } = await updateUserById(id, req.body || {}, actorAuthId)
  if (error) return res.status(status).json({ error })
  return res.json({ profile })

  
}

export async function updateUserStatus(req, res) {
  const { id } = req.params
  const { status } = req.body || {}
  const actorAuthId = getRequestActor(req)

  if (!status) return res.status(400).json({ error: 'Status is required.' })

  const { success, error, status: httpStatus } = await updateUserStatusById(id, status, actorAuthId)
  if (!success) return res.status(httpStatus).json({ error })
  return res.json({ success })
}