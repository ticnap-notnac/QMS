import { getRequestActor } from '../lib/requestUtils.js'
import { writeAudit } from '../lib/audit.js'
import { safeCreateNotificationsForRoles, safeCreateNotification } from '../lib/notificationHelper.js'
import {
  fetchReports,
  createNcrReport,
  createNcrReportWithUpload,
  updateNcrReport,
  updateNcrInvestigation,
  reviewNcrApproval,
  deleteNcrReport,
  assignReportToEmployee,
  submitReportRating,
  getReportRatingsStats,
} from '../services/ncrReportsService.js'

export async function getReports(req, res) {
  const scope = String(req.query?.scope || 'open').trim().toLowerCase()
  const actorAuthId = getRequestActor(req)
  try {
    return res.json(await fetchReports(scope, actorAuthId))
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) })
  }
}

export async function createReport(req, res) {
  const reportedByAuthId = getRequestActor(req)
  if (!reportedByAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })

  const { batch_number, severity, department_id, description } = req.body || {}
  if (!batch_number || !severity || !department_id || !description) {
    return res.status(400).json({ error: 'Batch number, severity, department, and description are required.' })
  }

  try {
    const { data, referenceNo } = await createNcrReport({ body: req.body, reportedByAuthId })
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_create',
      userAuthId: reportedByAuthId,
      details: { id: data?.id ?? null, reference_no: referenceNo }
    })
    return res.status(201).json(data)
  } catch (err) {
    console.error('[createReport] Error creating NCR report:', err)
    return res.status(err.status || 500).json({ error: err?.message || String(err) })
  }
}

export async function updateReport(req, res) {
  const { id } = req.params
  try {
    const data = await updateNcrReport({ id, body: req.body || {} })
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_update',
      userAuthId: getRequestActor(req),
      details: { id, updates: req.body }
    })
    return res.json(data)
  } catch (err) {
    return res.status(err.status || 500).json({ error: err?.message || String(err) })
  }
}

export async function updateReportInvestigation(req, res) {
  const { id } = req.params
  try {
    const { data, existing } = await updateNcrInvestigation({ id, body: req.body || {}, file: req.file })
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_investigation_update',
      userAuthId: getRequestActor(req),
      details: { id, updates: req.body }
    })
    await safeCreateNotificationsForRoles({
      roleNames: ['admin', 'auditor'],
      title: `Report Ready for Approval: ${existing.reference_no}`,
      message: `Report ${existing.reference_no} investigation was submitted and is ready for approval.`,
      type: 'info',
      reportId: existing.id,
    })
    return res.json(data)
  } catch (err) {
    return res.status(err.status || 500).json({ error: err?.message || String(err) })
  }
}

export async function assignReport(req, res) {
  const { id } = req.params
  const { assignedToId } = req.body || {}
  try {
    const result = await assignReportToEmployee({ reportId: id, assignedToId, currentUserAuthId: getRequestActor(req) })
    return res.json({ success: true, data: result.report, assignedTo: result.assignedTo })
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) || 'Failed to assign report.' })
  }
}

export async function deleteReport(req, res) {
  const { id } = req.params
  try {
    const deleted = await deleteNcrReport(id, getRequestActor(req))
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_delete',
      userAuthId: getRequestActor(req),
      details: { id, reference_no: deleted.reference_no || null }
    })
    return res.json({ success: true })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err?.message || String(err) })
  }
}

export async function createReportSubmit(req, res) {
  const reportedByAuthId = getRequestActor(req)
  if (!reportedByAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })

  const { batch_number, severity, department_id, description } = req.body || {}
  if (!batch_number || !severity || !department_id || !description) {
    return res.status(400).json({ error: 'Batch number, severity, department, and description are required.' })
  }

  try {
    const { data, referenceNo, reporter } = await createNcrReportWithUpload({ body: req.body, file: req.file, reportedByAuthId })
    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: 'ncr_create',
      userAuthId: reportedByAuthId,
      details: { id: data?.id ?? null, reference_no: referenceNo }
    })
    const reporterName = `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() || reporter.user_name || 'a user'
    await safeCreateNotificationsForRoles({
      roleNames: ['admin', 'auditor'],
      title: `New Report Submitted: ${referenceNo}`,
      message: `A new NCR report ${referenceNo} has been submitted by ${reporterName}. Please review and assign it.`,
      type: 'info',
      reportId: data?.id ?? null
    })
    return res.status(201).json({ success: true, data })
  } catch (err) {
    console.error('[createReportSubmit] Error creating multipart NCR report:', err)
    return res.status(err.status || 500).json({ error: err?.message || String(err) })
  }
}

export async function reviewReportApproval(req, res) {
  const { id } = req.params
  const { decision, reason } = req.body || {}
  const normalizedDecision = String(decision || '').trim().toLowerCase()

  if (!['approve', 'reject'].includes(normalizedDecision)) {
    return res.status(400).json({ error: 'Decision must be either approve or reject.' })
  }
  if (normalizedDecision === 'reject' && !String(reason || '').trim()) {
    return res.status(400).json({ error: 'Rejection reason is required.' })
  }

  try {
    const currentUser = req.dbUser
    const { updatedReport, report, nextStatus } = await reviewNcrApproval({ id, decision: normalizedDecision, reason, currentUser })

    const trimmedReason = String(reason || '').trim()
    if (normalizedDecision === 'approve') {
      await safeCreateNotification({
        userId: report.reported_by,
        title: `Report Approved: ${report.reference_no}`,
        message: `Your report ${report.reference_no} has been approved. It is now open for rating.`,
        type: 'info',
        reportId: report.id
      })
    } else {
      await safeCreateNotification({
        userId: report.reported_by,
        title: `Report Rejected: ${report.reference_no}`,
        message: `Your report ${report.reference_no} was rejected. Reason: ${trimmedReason}. Please update your investigation and resubmit.`,
        type: 'warning',
        reportId: report.id
      })
    }

    await writeAudit({
      level: 'audit',
      source: 'ncr_reports',
      action: normalizedDecision === 'approve' ? 'ncr_approve' : 'ncr_reject',
      userAuthId: currentUser.auth_id,
      details: {
        id: report.id,
        reference_no: report.reference_no,
        decision: normalizedDecision,
        reason: String(reason || '').trim() || null,
        status: nextStatus
      }
    })

    return res.json({ success: true, data: updatedReport })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err?.message || String(err) || 'Failed to review NCR report.' })
  }
}

export async function rateReport(req, res) {
  const { id } = req.params
  const { rating } = req.body || {}
  const reportedByAuthId = getRequestActor(req)
  if (!reportedByAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })

  if (typeof rating !== 'number' || rating < 0.5 || rating > 5.0) {
    return res.status(400).json({ error: 'Rating must be a number between 0.5 and 5.0.' })
  }

  try {
    const data = await submitReportRating({ reportId: id, rating, userAuthId: reportedByAuthId })
    return res.status(200).json({ success: true, data })
  } catch (err) {
    import('fs').then(fs => fs.appendFileSync('backend-error.log', new Date().toISOString() + ' rateReport error: ' + (err.stack || err.message) + '\n'));
    return res.status(err.status || 500).json({ error: err?.message || String(err) })
  }
}

export async function getReportRating(req, res) {
  const { id } = req.params
  const reportedByAuthId = getRequestActor(req)
  if (!reportedByAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })

  try {
    const stats = await getReportRatingsStats({ reportId: id, userAuthId: reportedByAuthId })
    return res.status(200).json({ success: true, data: stats })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err?.message || String(err) })
  }
}