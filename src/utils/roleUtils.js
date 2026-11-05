export function isSuperAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  return norm === 'super admin' || norm === 'super_admin' || norm === 'superadmin'
}

export function isAdminOrSuperAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  return (
    norm === 'admin' ||
    norm === 'super admin' ||
    norm === 'super_admin' ||
    norm === 'superadmin' ||
    norm === 'system administrator' ||
    norm === 'system_administrator' ||
    norm === 'administrator'
  )
}

export function isAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  if (!norm) return false
  return isAdminOrSuperAdminRole(norm)
}
