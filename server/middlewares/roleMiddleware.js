import { supabase } from '../lib/supabase.js'
import logger from '../utils/logger.js'

/**
 * Helper to fetch profile and role permissions for an authenticated user.
 */
async function fetchUserRoleAndPermissions(authId) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, auth_id, role_id, user_name, first_name, last_name')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error || !profile) return { profile: null, roleName: null, permissions: null }

  let roleName = null
  let permissions = null

  if (profile.role_id) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('role_name, permissions')
      .eq('id', profile.role_id)
      .maybeSingle()
    roleName = roleData?.role_name || null
    permissions = roleData?.permissions || null
  }

  return { profile, roleName, permissions }
}

/**
 * Middleware requiring specific action right or page permission.
 * @param {string} requiredRight - Key for required right (e.g., 'accept_decline_report', 'manage_iso')
 */
export function requirePermission(requiredRight) {
  return async (req, res, next) => {
    try {
      const authId = req.user?.id
      if (!authId) {
        return res.status(401).json({ error: 'You are not logged in. Please log in to continue.' })
      }

      const { profile, roleName, permissions } = await fetchUserRoleAndPermissions(authId)
      if (!profile) {
        return res.status(403).json({ error: 'We could not find your user profile. Please contact support.' })
      }

      const normalizedRole = String(roleName || '').trim().toLowerCase()
      let isAllowed = false

      if (normalizedRole === 'admin') {
        isAllowed = true
      } else if (permissions && typeof permissions === 'object') {
        const rights = Array.isArray(permissions.rights) ? permissions.rights : []
        const pages = Array.isArray(permissions.pages) ? permissions.pages : []
        isAllowed = rights.includes(requiredRight) || pages.includes(requiredRight)
      }

      logger.info('Permission check', { authId, roleName, requiredRight, isAllowed })

      if (!isAllowed) {
        return res.status(403).json({ error: `You do not have permission (${requiredRight}) to perform this action.` })
      }

      req.dbUser = { ...profile, role_name: roleName, permissions }
      next()
    } catch (err) {
      console.error('Permission middleware error:', err)
      return res.status(500).json({ error: 'We could not verify your permissions at this time. Please try again later.' })
    }
  }
}

/**
 * Reusable middleware requiring that the authenticated user has one of the specified roles or permission rights.
 * @param {string[]} allowedRoles - List of role names allowed to access this route.
 * @param {string} [requiredRight] - Optional right permission to evaluate dynamically.
 */
export function requireRoles(allowedRoles = [], requiredRight = null) {
  return async (req, res, next) => {
    try {
      const authId = req.user?.id
      if (!authId) {
        return res.status(401).json({ error: 'You are not logged in. Please log in to continue.' })
      }

      const { profile, roleName, permissions } = await fetchUserRoleAndPermissions(authId)
      if (!profile) {
        return res.status(403).json({ error: 'We could not find your user profile. Please contact support.' })
      }

      const normalizedRole = String(roleName || '').trim().toLowerCase()
      let isAllowed = false

      if (normalizedRole === 'admin' || normalizedRole === 'super admin') {
        isAllowed = true
      } else if (requiredRight && permissions && typeof permissions === 'object' && Array.isArray(permissions.rights)) {
        isAllowed = permissions.rights.includes(requiredRight)
      } else {
        const normalizedAllowed = (allowedRoles || []).map(r => String(r).trim().toLowerCase())
        isAllowed = normalizedAllowed.includes(normalizedRole)
      }

      logger.info('Role & Permission check', { authId, roleName, normalizedRole, allowedRoles, requiredRight, isAllowed })

      if (!isAllowed) {
        return res.status(403).json({ error: 'You do not have permission to perform this action. Please contact an administrator if you believe this is an error.' })
      }

      req.dbUser = { ...profile, role_name: roleName, permissions }
      next()
    } catch (err) {
      console.error('Role validation middleware error:', err)
      return res.status(500).json({ error: 'We could not verify your permissions at this time. Please try again later.' })
    }
  }
}
