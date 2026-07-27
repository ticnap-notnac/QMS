
/**
 * Check if a role name is Admin or Super Admin (restricted target roles).
 * @param {string} roleName 
 * @returns {boolean}
 */
export function isAdminOrSuperAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  return (
    norm === 'admin' ||
    norm === 'super admin' ||
    norm === 'super_admin' ||
    norm === 'superadmin' ||
    norm === 'system administrator' ||
    norm === 'administrator'
  )
}
