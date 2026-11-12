import { supabase } from './supabase.js'
import { sendNotificationEmail } from '../services/emailService.js'

/**
 * Creates a notification for a user and sends an email.
 * @param {Object} params - Notification parameters.
 * @param {string} params.title - The notification title.
 * @param {string} params.message - The notification message.
 * @param {string} [params.type='info'] - The type of notification.
 * @param {number|null} [params.reportId=null] - Associated report ID.
 * @param {string|number|null} [params.userId=null] - The user ID to notify.
 * @returns {Promise<Object|null>} The created notification record.
 */
export async function createNotification({ title, message, type = 'info', reportId = null, userId = null }) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('notifications')
    .insert([{ title, message, type, report_id: reportId, user_id: userId, is_read: false }])
    .select()

  if (error) throw error

  sendNotificationEmail(userId, title, message)
    .catch(err => console.error('Failed to send SMTP email in background:', err.message))

  return data ? data[0] : null
}

/**
 * Fetches users by their role names.
 * @param {string[]} [roleNames=[]] - Array of role names to search for.
 * @returns {Promise<Object[]>} Array of user objects.
 */
export async function getUsersByRoleNames(roleNames = []) {
  const normalizedRoleNames = [
    ...new Set(
      (roleNames || []).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean)
    ),
  ]
  if (normalizedRoleNames.length === 0) return []

  const { data: roles, error: rolesError } = await supabase.from('roles').select('id, role_name')
  if (rolesError) throw rolesError

  const targetRoleIds = (roles || [])
    .filter((role) => normalizedRoleNames.includes(String(role.role_name || '').trim().toLowerCase()))
    .map((role) => role.id)

  const { data: positions } = await supabase.from('positions').select('id, position_name')
  const targetPositionIds = (positions || [])
    .filter((pos) => normalizedRoleNames.includes(String(pos.position_name || '').trim().toLowerCase()))
    .map((pos) => pos.id)

  let query = supabase
    .from('users')
    .select('id, user_name, first_name, last_name, auth_id, role_id, position_id')

  if (targetRoleIds.length > 0 && targetPositionIds.length > 0) {
    query = query.or(`role_id.in.(${targetRoleIds.join(',')}),position_id.in.(${targetPositionIds.join(',')})`)
  } else if (targetRoleIds.length > 0) {
    query = query.in('role_id', targetRoleIds)
  } else if (targetPositionIds.length > 0) {
    query = query.in('position_id', targetPositionIds)
  } else {
    return []
  }

  const { data: users, error: usersError } = await query
  if (usersError) throw usersError

  return users || []
}

/**
 * Creates notifications for users with specific roles.
 * @param {Object} params - Notification parameters.
 * @param {string[]} [params.roleNames=[]] - Target roles.
 * @param {string} params.title - The notification title.
 * @param {string} params.message - The notification message.
 * @param {string} [params.type='info'] - The type of notification.
 * @param {number|null} [params.reportId=null] - Associated report ID.
 * @returns {Promise<number>} Number of notifications created.
 */
export async function createNotificationsForRoles({ roleNames = [], title, message, type = 'info', reportId = null }) {
  const users = await getUsersByRoleNames(roleNames)
  if (users.length === 0) return 0

  const rows = users.map((user) => ({
    user_id: user.id,
    title,
    message,
    type,
    report_id: reportId,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) throw error

  rows.forEach((row) => {
    sendNotificationEmail(row.user_id, row.title, row.message)
      .catch((err) => console.error('Failed to send SMTP email in background:', err.message))
  })

  return rows.length
}

/**
 * Creates notifications for global roles and specific department roles.
 * @param {Object} params - Notification parameters.
 * @param {string[]} [params.globalRoleNames=[]] - Global roles to notify.
 * @param {string[]} [params.departmentRoleNames=[]] - Department-specific roles.
 * @param {number} params.departmentId - The department ID.
 * @param {string} params.title - The notification title.
 * @param {string} params.message - The notification message.
 * @param {string} [params.type='info'] - The type of notification.
 * @param {number|null} [params.reportId=null] - Associated report ID.
 * @returns {Promise<number>} Number of notifications created.
 */
export async function createNotificationsForRolesAndDepartment({ globalRoleNames = [], departmentRoleNames = [], departmentId, title, message, type = 'info', reportId = null }) {
  const globalUsers = await getUsersByRoleNames(globalRoleNames)
  let deptUsers = []
  
  if (departmentRoleNames.length > 0 && departmentId) {
    const roleUsers = await getUsersByRoleNames(departmentRoleNames)
    const { data: deptUserRows } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', departmentId)
    
    const deptUserIds = new Set((deptUserRows || []).map(u => u.id))
    deptUsers = roleUsers.filter(u => deptUserIds.has(u.id))
  }

  const allUsersMap = new Map()
  globalUsers.forEach(u => allUsersMap.set(u.id, u))
  deptUsers.forEach(u => allUsersMap.set(u.id, u))

  const uniqueUsers = Array.from(allUsersMap.values())
  if (uniqueUsers.length === 0) return 0

  const rows = uniqueUsers.map((user) => ({
    user_id: user.id,
    title,
    message,
    type,
    report_id: reportId,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) throw error

  rows.forEach((row) => {
    sendNotificationEmail(row.user_id, row.title, row.message)
      .catch((err) => console.error('Failed to send SMTP email in background:', err.message))
  })

  return rows.length
}

/**
 * Safely creates notifications for roles by wrapping the call in try-catch.
 */
export async function safeCreateNotificationsForRoles(options) {
  try {
    await createNotificationsForRoles(options)
  } catch (err) {
    console.warn('Failed to create notifications for roles:', err?.message || err)
  }
}

/**
 * Safely creates notifications for global roles and department-specific roles.
 */
export async function safeCreateNotificationsForRolesAndDepartment(options) {
  try {
    await createNotificationsForRolesAndDepartment(options)
  } catch (err) {
    console.warn('Failed to create notifications for roles and department:', err?.message || err)
  }
}

/**
 * Safely creates a single user notification by wrapping the call in try-catch.
 */
export async function safeCreateNotification(options) {
  try {
    await createNotification(options)
  } catch (err) {
    console.warn('Failed to create notification:', err?.message || err)
  }
}

export default {
  createNotification,
  createNotificationsForRoles,
  createNotificationsForRolesAndDepartment,
  safeCreateNotificationsForRoles,
  safeCreateNotificationsForRolesAndDepartment,
  safeCreateNotification
}
