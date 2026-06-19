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
    return { background: 'rgba(148, 163, 184, 0.15)', color: '#334155', borderColor: 'rgba(148, 163, 184, 0.35)' }
  }
  return { background: 'rgba(34, 197, 94, 0.12)', color: '#166534', borderColor: 'rgba(34, 197, 94, 0.3)' }
}

export function getSeverityStyle(severity) {
  const value = String(severity).toLowerCase()
  if (value === 'high') return { background: 'rgba(239, 68, 68, 0.12)', color: '#991b1b', borderColor: 'rgba(239, 68, 68, 0.3)' }
  if (value === 'medium') return { background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', borderColor: 'rgba(245, 158, 11, 0.35)' }
  return { background: 'rgba(59, 130, 246, 0.12)', color: '#1e40af', borderColor: 'rgba(59, 130, 246, 0.3)' }
}

export function getApprovalState(report) {
  return String(report?.status || '').trim().toLowerCase() === 'closed' ? 'approved' : 'pending'
}

export function formatAssignedUser(report) {
  if (!report?.assigned_to) return ''
  return `Assigned to user #${report.assigned_to}`
}
