import { Router } from 'express'
import multer from 'multer'
import { assignReport, createReport, createReportSubmit, deleteReport, getReports, reviewReportApproval, updateReport, updateReportInvestigation, rateReport, getReportRating, getRecurringUnlinkedIssues } from '../controllers/ncrController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createReportSchema, updateReportSchema, assignReportSchema, reviewReportApprovalSchema, rateReportSchema } from '../validations/ncrValidation.js'

const router = Router()

const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max per file
    files: 3,
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file?.mimetype || '').toLowerCase()
    if (ALLOWED_EVIDENCE_MIME_TYPES.has(mime)) {
      return cb(null, true)
    }
    const err = Object.assign(
      new Error(`Unsupported file type "${file?.mimetype || 'unknown'}". Allowed types: JPEG, PNG, WEBP, GIF, PDF, Word, Excel, TXT, CSV.`),
      { status: 400 }
    )
    return cb(err, false)
  },
})

router.get('/ncr', requirePermission(['view_ncr_reports', 'reports', 'dcc', 'iso', 'dashboard']), getReports)
router.get('/ncr/recurring-trends', requirePermission(['view_ncr_reports', 'reports', 'dcc', 'dashboard']), getRecurringUnlinkedIssues)
router.post('/ncr', requirePermission(['create_ncr_report', 'create_report']), validateRequest(createReportSchema), createReport)
router.post('/ncr/submit', requirePermission(['create_ncr_report', 'create_report']), upload.array('evidence_files', 3), createReportSubmit)
router.put('/ncr/:id', validateRequest(updateReportSchema), updateReport)
router.put('/ncr/:id/investigation', upload.array('investigation_evidence_files', 3), updateReportInvestigation)
router.put('/ncr/:id/assign', requirePermission('assign_report'), validateRequest(assignReportSchema), assignReport)
router.put('/ncr/:id/approval', requirePermission('accept_decline_report'), validateRequest(reviewReportApprovalSchema), reviewReportApproval)
router.post('/ncr/:id/rate', validateRequest(rateReportSchema), rateReport)
router.get('/ncr/:id/rating', getReportRating)
router.delete('/ncr/:id', deleteReport)

export default router
