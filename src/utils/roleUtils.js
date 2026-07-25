/**
 * Checks if a given role name represents an Admin or Super Admin role.
 * @param {string} roleName 
 * @returns {boolean}
 */
export function isAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  if (!norm) return false

  return (
    norm === 'admin' ||
    norm === 'super admin' ||
    norm === 'super_admin' ||
    norm === 'system administrator' ||
    norm === 'system_administrator' ||
    norm === 'administrator' ||
    norm.includes('admin')
  )
}
