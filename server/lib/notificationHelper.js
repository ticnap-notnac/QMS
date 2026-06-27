import { createNotificationsForRoles, createNotificationsForRolesAndDepartment, createNotification } from '../services/ncrReportsService.js'

/**
 * Safely creates notifications for roles by wrapping the service call in a try-catch block
 * to prevent logging failures from impacting request completion.
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
 * Safely creates a single user notification by wrapping the service call in a try-catch block.
 */
export async function safeCreateNotification(options) {
  try {
    await createNotification(options)
  } catch (err) {
    console.warn('Failed to create notification:', err?.message || err)
  }
}

export default { safeCreateNotificationsForRoles, safeCreateNotificationsForRolesAndDepartment, safeCreateNotification }
