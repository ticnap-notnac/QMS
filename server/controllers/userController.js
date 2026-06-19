import { getRequestActor } from '../lib/requestUtils.js'
import logger from '../utils/logger.js'
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
  const { firstName, lastName, email, password, userName, contactNumber, roleId, departmentId, siteId } = req.body || {}

  // Basic input validation
  if (!firstName || !lastName || !email || !password || !userName || !departmentId) {
    return res.status(400).json({ error: 'First name, last name, email, password, username, and department are required.' })
  }

  // Additional validation could be added here (e.g., email format, password strength)

  const { authUser, profile, error, status } = await createUserWithAuth({
    firstName,
    lastName,
    email,
    password,
    userName,
    contactNumber,
    roleId,
    departmentId,
    siteId,
  })

  if (error) {
    logger.error('Create user error', { error, status })
    return res.status(status).json({ error })
  }
  logger.info('User created', { userId: authUser?.id })
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

  // Basic validation: ensure body is not empty
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body cannot be empty.' })
  }

  const { profile, error, status } = await updateUserById(id, req.body, actorAuthId)
  if (error) {
    logger.error('Update user error', { error, status, userId: id })
    return res.status(status).json({ error })
  }
  logger.info('User updated', { userId: id })
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