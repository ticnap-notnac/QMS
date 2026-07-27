import { Router } from 'express'
import multer from 'multer'
import { assignReport, createReport, createReportSubmit, deleteReport, getReports, reviewReportApproval, updateReport, updateReportInvestigation, rateReport, getReportRating, getRecurringUnlinkedIssues } from '../controllers/ncrController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createReportSchema, assignReportSchema, reviewReportApprovalSchema, rateReportSchema } from '../validations/ncrValidation.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

router.get('/ncr', getReports)
router.get('/ncr/recurring-trends', requirePermission('view_reports'), getRecurringUnlinkedIssues)
router.post('/ncr', validateRequest(createReportSchema), createReport)
router.post('/ncr/submit', upload.array('evidence_files', 3), createReportSubmit)
router.put('/ncr/:id', validateRequest(createReportSchema), updateReport)
router.put('/ncr/:id/investigation', upload.array('investigation_evidence_files', 3), updateReportInvestigation)
router.put('/ncr/:id/assign', requirePermission('assign_report'), validateRequest(assignReportSchema), assignReport)
router.put('/ncr/:id/approval', requirePermission('accept_decline_report'), validateRequest(reviewReportApprovalSchema), reviewReportApproval)
router.post('/ncr/:id/rate', validateRequest(rateReportSchema), rateReport)
router.get('/ncr/:id/rating', getReportRating)
router.delete('/ncr/:id', deleteReport)

export default router