import { supabase } from '../lib/supabase.js'

/**
 * Reusable middleware to require that the authenticated user has one of the specified roles.
 * @param {string[]} allowedRoles - List of role names allowed to access this route.
 */
export function requireRoles(allowedRoles) {
  return async (req, res, next) => {
    try {
      const authId = req.user?.id
      if (!authId) {
        return res.status(401).json({ error: 'Unauthorized. No active session.' })
      }

      // Fetch user profile from DB
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, auth_id, role_id, user_name, first_name, last_name')
        .eq('auth_id', authId)
        .maybeSingle()

      if (error || !profile) {
        return res.status(403).json({ error: 'Access forbidden. User profile not found.' })
      }

      let roleName = null
      if (profile.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', profile.role_id)
          .maybeSingle()
        roleName = roleData?.role_name || null
      }

      const normalizedRole = String(roleName || '').trim().toLowerCase()
      const isAllowed = allowedRoles.map(r => String(r).trim().toLowerCase()).includes(normalizedRole)

      if (!isAllowed) {
        return res.status(403).json({ error: `Access forbidden. Requires one of these roles: ${allowedRoles.join(', ')}` })
      }

      // Attach the DB user profile with role_name to the request object for downstream use
      req.dbUser = { ...profile, role_name: roleName }
      
      next()
    } catch (err) {
      console.error('Role validation middleware error:', err)
      return res.status(500).json({ error: 'Internal server error during role validation.' })
    }
  }
}
