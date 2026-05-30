export function formatDisplayName(user) {
  if (!user) return null
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return fullName || user.user_name || user.email || null
}

export default { formatDisplayName }
