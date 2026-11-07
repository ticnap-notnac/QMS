import { supabase } from '../lib/supabase.js'
import logger from '../utils/logger.js'

/**
 * Helper to fetch profile and role permissions for an authenticated user.
 */
export async function fetchUserRoleAndPermissions(authId) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, auth_id, role_id, position_id, department_id, site_id, status, user_name, first_name, last_name')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error || !profile) return { profile: null, roleName: null, permissions: null }

  let resolvedRoleId = profile.role_id || null

  if (!resolvedRoleId && profile.position_id) {
    const { data: posData } = await supabase
      .from('positions')
      .select('role_id')
      .eq('id', profile.position_id)
      .maybeSingle()
    if (posData?.role_id) {
      resolvedRoleId = posData.role_id
      profile.role_id = resolvedRoleId
    }
  }

  let roleName = null
  let permissions = null

  if (resolvedRoleId) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('role_name, permissions')
      .eq('id', resolvedRoleId)
      .maybeSingle()
    roleName = roleData?.role_name || null
    permissions = roleData?.permissions || null
  }

  return { profile, roleName, permissions }
}

function isAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  if (!norm) return false
  return (
    norm === 'admin' ||
    norm === 'super admin' ||
    norm === 'super_admin' ||
    norm === 'system administrator' ||
    norm === 'system_administrator' ||
    norm === 'administrator' ||
    norm === 'superadmin'
  )
}

const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    pages: ['dashboard', 'reports', 'iso', 'dcc', 'audit_tools', 'admin_panel', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
      'accept_decline_report', 'assign_report',
      'create_ncr_report', 'create_car_report', 'create_qddr_report', 'create_report',
      'edit_delete_report', 'submit_capa', 'verify_car',
      'manage_iso', 'manage_users', 'manage_roles', 'manage_categories',
      'manage_audit_schedules', 'view_logs'
    ],
  },
  auditor: {
    pages: ['dashboard', 'reports', 'iso', 'dcc', 'audit_tools', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
      'accept_decline_report', 'assign_report',
      'create_ncr_report', 'create_car_report', 'create_qddr_report', 'create_report',
      'submit_capa', 'manage_iso', 'manage_audit_schedules', 'view_logs'
    ],
  },
  'qa officer': {
    pages: ['dashboard', 'reports', 'iso', 'dcc', 'audit_tools', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
      'accept_decline_report', 'assign_report',
      'create_ncr_report', 'create_car_report', 'create_qddr_report', 'create_report',
      'edit_delete_report', 'submit_capa', 'verify_car',
      'manage_iso', 'manage_audit_schedules', 'view_logs'
    ],
  },
  'team leader': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
      'create_ncr_report', 'create_car_report', 'create_qddr_report', 'create_report',
      'accept_decline_report', 'assign_report'
    ],
  },
  'warehouse supervisor': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
      'create_ncr_report', 'create_car_report', 'create_qddr_report', 'create_report',
      'accept_decline_report', 'assign_report'
    ],
  },
  'warehouse executive': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_qddr_reports', 'view_audit_schedules', 'view_audit_reports',
      'create_ncr_report', 'create_car_report', 'create_qddr_report', 'create_report',
      'accept_decline_report', 'assign_report'
    ],
  },
  checker: {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_audit_schedules', 'view_audit_reports',
      'create_ncr_report', 'create_report', 'verify_car'
    ],
  },
  'warehouse checker': {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: [
      'view_ncr_reports', 'view_car_reports', 'view_audit_schedules', 'view_audit_reports',
      'create_ncr_report', 'create_report', 'verify_car'
    ],
  },
  default: {
    pages: ['dashboard', 'reports', 'dcc', 'settings'],
    rights: ['view_ncr_reports', 'create_ncr_report', 'create_report', 'view_audit_schedules', 'view_audit_reports'],
  },
}

export function resolveEffectivePermissions(roleName, permissions) {
  if (permissions && typeof permissions === 'object' && (Array.isArray(permissions.rights) || Array.isArray(permissions.pages))) {
    return {
      pages: Array.isArray(permissions.pages) ? permissions.pages : [],
      rights: Array.isArray(permissions.rights) ? permissions.rights : [],
    }
  }
  const norm = String(roleName || '').trim().toLowerCase()
  if (isAdminRole(norm)) return DEFAULT_ROLE_PERMISSIONS.admin
  return DEFAULT_ROLE_PERMISSIONS[norm] || DEFAULT_ROLE_PERMISSIONS.default
}

/**
 * Middleware requiring specific action right or page permission.
 * @param {string|string[]} requiredRight - Key or array of keys for required right/page
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

      if (profile.status && String(profile.status).toUpperCase() !== 'ACTIVE') {
        return res.status(403).json({ error: 'Your account is deactivated or inactive. Please contact an administrator.' })
      }

      const effectivePerms = resolveEffectivePermissions(roleName, permissions)
      let isAllowed = false

      const requiredList = Array.isArray(requiredRight) ? requiredRight : [requiredRight]

      if (isAdminRole(roleName)) {
        isAllowed = true
      } else if (effectivePerms) {
        const rights = Array.isArray(effectivePerms.rights) ? effectivePerms.rights : []
        const pages = Array.isArray(effectivePerms.pages) ? effectivePerms.pages : []
        isAllowed = requiredList.some(r => rights.includes(r) || pages.includes(r))
      }

      logger.info('Permission check', { authId, roleName, requiredRight, isAllowed })

      if (!isAllowed) {
        const label = Array.isArray(requiredRight) ? requiredRight.join(' or ') : requiredRight
        return res.status(403).json({ error: `You do not have permission (${label}) to perform this action.` })
      }

      req.dbUser = { ...profile, role_name: roleName, permissions: effectivePerms }
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
 * @param {string|string[]} [requiredRight] - Optional right permission(s) to evaluate dynamically.
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

      if (profile.status && String(profile.status).toUpperCase() !== 'ACTIVE') {
        return res.status(403).json({ error: 'Your account is deactivated or inactive. Please contact an administrator.' })
      }

      const normalizedRole = String(roleName || '').trim().toLowerCase()
      const effectivePerms = resolveEffectivePermissions(roleName, permissions)
      let isAllowed = false

      if (isAdminRole(roleName)) {
        isAllowed = true
      } else {
        const requiredList = requiredRight
          ? (Array.isArray(requiredRight) ? requiredRight : [requiredRight])
          : []
        const rights = Array.isArray(effectivePerms?.rights) ? effectivePerms.rights : []
        const pages = Array.isArray(effectivePerms?.pages) ? effectivePerms.pages : []
        const hasRight = requiredList.some(r => rights.includes(r) || pages.includes(r))
        const normalizedAllowed = (allowedRoles || []).map(r => String(r).trim().toLowerCase())
        const hasRole = normalizedAllowed.includes(normalizedRole)
        isAllowed = hasRight || hasRole
      }

      logger.info('Role & Permission check', { authId, roleName, normalizedRole, allowedRoles, requiredRight, isAllowed })

      if (!isAllowed) {
        return res.status(403).json({ error: 'You do not have permission to perform this action. Please contact an administrator if you believe this is an error.' })
      }

      req.dbUser = { ...profile, role_name: roleName, permissions: effectivePerms }
      next()
    } catch (err) {
      console.error('Role validation middleware error:', err)
      return res.status(500).json({ error: 'We could not verify your permissions at this time. Please try again later.' })
    }
  }
}
