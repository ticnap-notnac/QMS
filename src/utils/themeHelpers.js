export function formatDate(value) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function normalizeSeverity(value) {
  return String(value || 'low').trim().toLowerCase()
}

export function getStatusStyle(status) {
  if (String(status).toLowerCase() === 'closed') {
    return { background: 'rgba(148, 163, 184, 0.18)', color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.3)' }
  }
  return { background: 'rgba(34, 197, 94, 0.16)', color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.28)' }
}

export function getSeverityStyle(severity) {
  const value = String(severity).toLowerCase()
  if (value === 'high') return { background: 'rgba(239, 68, 68, 0.18)', color: '#fecaca', borderColor: 'rgba(239, 68, 68, 0.32)' }
  if (value === 'medium') return { background: 'rgba(245, 158, 11, 0.18)', color: '#fde68a', borderColor: 'rgba(245, 158, 11, 0.32)' }
  return { background: 'rgba(59, 130, 246, 0.18)', color: '#bfdbfe', borderColor: 'rgba(59, 130, 246, 0.32)' }
}

export function getApprovalState(report) {
  return String(report?.status || '').trim().toLowerCase() === 'closed' ? 'approved' : 'pending'
}

export function formatAssignedUser(report) {
  if (!report?.assigned_to) return ''
  return `Assigned to user #${report.assigned_to}`
}
