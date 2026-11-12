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

import { isAdminOrSuperAdminRole } from '../utils/roleUtils.js'
import { fetchUserRoleAndPermissions } from '../middlewares/roleMiddleware.js'
import { supabase } from '../lib/supabase.js'

/**
 * Checks if a role or position corresponds to an Administrator or Super Administrator role.
 */
async function isTargetRoleAdmin(roleId, positionId) {
  let resolvedRoleId = roleId
  if (!resolvedRoleId && positionId) {
    const { data: pos } = await supabase.from('positions').select('role_id').eq('id', positionId).maybeSingle()
    if (pos?.role_id) resolvedRoleId = pos.role_id
  }
  if (!resolvedRoleId) return false

  const { data: role } = await supabase.from('roles').select('role_name').eq('id', resolvedRoleId).maybeSingle()
  return isAdminOrSuperAdminRole(role?.role_name)
}

export async function getUsers(req, res) {
  let actorRoleName = req.dbUser?.role_name || ''
  let actorSiteId = req.dbUser?.site_id ?? null

  if (!req.dbUser && req.user?.id) {
    const { profile, roleName } = await fetchUserRoleAndPermissions(req.user.id)
    actorRoleName = roleName || ''
    actorSiteId = profile?.site_id ?? null
  }

  const { data, error } = await fetchAllUsers({ actorRoleName, actorSiteId })
  if (error) return res.status(500).json({ error })
  return res.json(data)
}

export async function createUser(req, res) {
  const { firstName, lastName, email, password, userName, contactNumber, roleId, departmentId, siteId, positionId } = req.body || {}
  const actorRoleName = req.dbUser?.role_name || ''

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

  // SEC-07: Role hierarchy check - non-admins cannot assign Admin roles or positions
  if (!isAdminOrSuperAdminRole(actorRoleName)) {
    const isNewRoleAdmin = await isTargetRoleAdmin(roleId, positionId)
    if (isNewRoleAdmin) {
      return res.status(403).json({ error: 'Only Administrators can assign Administrator roles or positions.' })
    }
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
    positionId: positionId ? Number(positionId) : null,
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
  const actorRoleName = req.dbUser?.role_name || ''

  // SEC-07: Self-protection - cannot delete own account
  if (req.dbUser?.id && String(req.dbUser.id) === String(id)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' })
  }

  // SEC-07: Role hierarchy - only Admins can delete Admin accounts
  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, role_id, position_id')
    .eq('id', id)
    .maybeSingle()

  if (targetError) return res.status(500).json({ error: targetError.message })
  if (!targetUser) return res.status(404).json({ error: 'User not found.' })

  const isTargetAdmin = await isTargetRoleAdmin(targetUser.role_id, targetUser.position_id)
  if (isTargetAdmin && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can delete Administrator accounts.' })
  }

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

  const { firstName, lastName, contactNumber, roleId, positionId, status: nextStatus } = req.body
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

  // SEC-07: Self-protection - cannot deactivate or suspend own account via updateUser
  if (
    nextStatus !== undefined &&
    req.dbUser?.id &&
    String(req.dbUser.id) === String(id) &&
    String(nextStatus).trim().toUpperCase() !== 'ACTIVE'
  ) {
    return res.status(400).json({ error: 'You cannot deactivate or suspend your own account.' })
  }

  // SEC-07: Role hierarchy - check target user's current role (including position_id fallback)
  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, role_id, position_id')
    .eq('id', id)
    .maybeSingle()

  if (targetError) return res.status(500).json({ error: targetError.message })
  if (!targetUser) return res.status(404).json({ error: 'User not found.' })

  const isTargetAdmin = await isTargetRoleAdmin(targetUser.role_id, targetUser.position_id)
  if (isTargetAdmin && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can modify Administrator accounts.' })
  }

  // SEC-07: Role hierarchy - non-admins cannot assign Admin roles or positions
  if ((roleId !== undefined || positionId !== undefined) && !isAdminOrSuperAdminRole(actorRoleName)) {
    const isNewRoleAdmin = await isTargetRoleAdmin(roleId, positionId)
    if (isNewRoleAdmin) {
      return res.status(403).json({ error: 'Only Administrators can assign Administrator roles or positions.' })
    }
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
  const actorRoleName = req.dbUser?.role_name || ''

  if (!status) return res.status(400).json({ error: 'Status is required.' })

  const normalizedStatus = String(status || '').trim().toUpperCase()

  // SEC-07: Self-protection - cannot deactivate or suspend own account
  if (req.dbUser?.id && String(req.dbUser.id) === String(id) && normalizedStatus !== 'ACTIVE') {
    return res.status(400).json({ error: 'You cannot deactivate or suspend your own account.' })
  }

  // SEC-07: Role hierarchy - only Admins can modify Admin account status
  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, role_id, position_id')
    .eq('id', id)
    .maybeSingle()

  if (targetError) return res.status(500).json({ error: targetError.message })
  if (!targetUser) return res.status(404).json({ error: 'User not found.' })

  const isTargetAdmin = await isTargetRoleAdmin(targetUser.role_id, targetUser.position_id)
  if (isTargetAdmin && !isAdminOrSuperAdminRole(actorRoleName)) {
    return res.status(403).json({ error: 'Only Administrators can modify Administrator account status.' })
  }

  const { success, error, status: httpStatus } = await updateUserStatusById(id, status, actorAuthId, req.dbUser)
  if (!success) return res.status(httpStatus).json({ error })
  return res.json({ success })
}
