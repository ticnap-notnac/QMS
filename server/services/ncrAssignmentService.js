import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

function normalizeId(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isNaN(numeric) ? value : numeric
}

export async function assignReportToEmployee({ reportId, assignedToId, currentUserAuthId }) {
  const normalizedReportId = normalizeId(reportId)
  const normalizedAssignedToId = normalizeId(assignedToId)

  if (!normalizedReportId) {
    throw new Error('Report id is required.')
  }

  if (!normalizedAssignedToId) {
    throw new Error('Assigned employee is required.')
  }

  if (!currentUserAuthId) {
    throw new Error('Missing x-user-auth-id header.')
  }

  const { data: currentUser, error: currentUserError } = await supabase
    .from('users')
    .select('id, user_name')
    .eq('auth_id', currentUserAuthId)
    .maybeSingle()

  if (currentUserError) {
    throw currentUserError
  }

  if (!currentUser) {
    throw new Error('Current user profile not found.')
  }

  const { data: assignee, error: assigneeError } = await supabase
    .from('users')
    .select('id, user_name')
    .eq('id', normalizedAssignedToId)
    .maybeSingle()

  if (assigneeError) {
    throw assigneeError
  }

  if (!assignee) {
    throw new Error('Assigned employee not found.')
  }

  const { data: report, error: reportError } = await supabase
    .from('ncr_reports')
    .select('id, reference_no')
    .eq('id', normalizedReportId)
    .maybeSingle()

  if (reportError) {
    throw reportError
  }

  if (!report) {
    throw new Error('NCR report not found.')
  }

  if (report.assigned_to) {
    throw new Error('This report is already assigned and cannot be reassigned.')
  }

  const assignedAt = new Date().toISOString()

  const { data: updatedReport, error: updateError } = await supabase
    .from('ncr_reports')
    .update({
      assigned_to: assignee.id,
      assigned_at: assignedAt,
      assigned_by: currentUser.id,
    })
    .eq('id', normalizedReportId)
    .select('*')
    .maybeSingle()

  if (updateError) {
    throw updateError
  }

  const { error: notificationError } = await supabase
    .from('notifications')
    .insert([{ 
      user_id: assignee.id,
      title: `New Report Assigned: ${report.reference_no}`,
      message: `You have been assigned to investigate report ${report.reference_no}. Please review the details and submit your investigation.`,
      type: 'info',
      report_id: report.id,
      created_at: assignedAt,
      is_read: false,
    }])

  if (notificationError) {
    throw notificationError
  }

  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert([{ 
      user_id: currentUser.id,
      action: 'ASSIGN_REPORT',
      module_name: 'ncr_reports',
      record_id: report.id,
      created_at: assignedAt,
    }])

  if (auditError) {
    throw auditError
  }

  try {
    await writeAudit({
      source: 'ncr_reports',
      action: 'assign_report',
      userAuthId: currentUserAuthId,
      details: {
        report_id: report.id,
        reference_no: report.reference_no,
        assigned_to: assignee.id,
      },
    })
  } catch (auditLogError) {
    console.warn('Failed to record assign_report audit log:', auditLogError?.message || auditLogError)
  }

  return {
    report: updatedReport || null,
    assignedTo: assignee,
  }
}
