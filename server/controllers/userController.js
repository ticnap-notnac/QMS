import { getRequestActor } from '../lib/requestUtils.js'
import logger from '../utils/logger.js'
import { sendNewUserCredentialsEmail } from '../services/emailService.js'
import {
  fetchAllUsers,
  createUserWithAuth,
  deleteUserById,
  updateUserById,
  updateUserStatusById, 
} from '../services/userService.js'

import { isSuperAdminRole, isAdminOrSuperAdminRole } from '../utils/roleUtils.js'
import { supabase } from '../lib/supabase.js'

export async function getUsers(_req, res) {
  const { data, error } = await fetchAllUsers()
  if (error) return res.status(500).json({ error })
  return res.json(data)
}

export async function createUser(req, res) {
  const { firstName, lastName, email, password, userName, contactNumber, roleId, departmentId, siteId } = req.body || {}
  const actorRoleName = req.dbUser?.role_name || ''

  // Only Super Admin can assign Admin or Super Admin roles
  if (!isSuperAdminRole(actorRoleName) && roleId) {
    const { data: targetRole } = await supabase.from('roles').select('role_name').eq('id', roleId).maybeSingle()
    if (targetRole && isAdminOrSuperAdminRole(targetRole.role_name)) {
      return res.status(403).json({ error: 'Only Super Admins can assign the Admin or Super Admin role.' })
    }
  }

  // Basic input validation
  if (!firstName || !lastName || !email || !password || !userName || !departmentId) {
    return res.status(400).json({ error: 'First name, last name, email, password, username, and department are required.' })
  }

  // Additional validation
  const invalidNameRegex = /[^a-zA-Z\s\-']/
  if (invalidNameRegex.test(firstName) || invalidNameRegex.test(lastName)) {
    return res.status(400).json({ error: 'First and Last names cannot contain numbers or special characters.' })
  }
  
  if (contactNumber && !/^\d{11}$/.test(contactNumber)) {
    return res.status(400).json({ error: 'Contact number must be exactly 11 digits.' })
  }

  if (!/@gmail\.com$/i.test(String(email || '').trim())) {
    return res.status(400).json({ error: 'Only Gmail addresses are allowed.' })
  }

  const { authUser, profile, error, status } = await createUserWithAuth({
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: String(email).trim().toLowerCase(),
    password,
    userName: String(userName).trim(),
    contactNumber: contactNumber ? String(contactNumber).trim() : null,
    roleId: roleId ? Number(roleId) : null,
    departmentId: departmentId ? Number(departmentId) : null,
    siteId: siteId ? Number(siteId) : null,
  })

  if (error) {
    logger.error('Create user error', { error, status })
    return res.status(status || 400).json({ error })
  }
  logger.info('User created', { userId: authUser?.id })

  const sanitizedEmail = String(email).trim().toLowerCase()
  sendNewUserCredentialsEmail({
    toEmail: sanitizedEmail,
    password,
    frontendUrl: process.env.FRONTEND_URL || 'https://qms-jade.vercel.app',
    displayName: `${firstName || ''} ${lastName || ''}`.trim() || userName || 'there',
  }).catch(err => logger.error('Failed to send user credentials email', { error: err?.message }))

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
  const actorRoleName = req.dbUser?.role_name || ''

  // Basic validation: ensure body is not empty
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body cannot be empty.' })
  }

  const targetRoleId = req.body.roleId || req.body.role_id
  if (!isSuperAdminRole(actorRoleName) && targetRoleId) {
    const { data: targetRole } = await supabase.from('roles').select('role_name').eq('id', targetRoleId).maybeSingle()
    if (targetRole && isAdminOrSuperAdminRole(targetRole.role_name)) {
      return res.status(403).json({ error: 'Only Super Admins can assign the Admin or Super Admin role.' })
    }
  }

  const { firstName, lastName, contactNumber } = req.body
  const invalidNameRegex = /[^a-zA-Z\s\-']/
  if (
    (firstName && invalidNameRegex.test(firstName)) || 
    (lastName && invalidNameRegex.test(lastName))
  ) {
    return res.status(400).json({ error: 'First and Last names cannot contain numbers or special characters.' })
  }

  if (contactNumber && !/^\d{11}$/.test(contactNumber)) {
    return res.status(400).json({ error: 'Contact number must be exactly 11 digits.' })
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