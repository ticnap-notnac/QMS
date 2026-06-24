import { Router } from 'express'
import multer from 'multer'
import { assignReport, createReport, createReportSubmit, deleteReport, getReports, reviewReportApproval, updateReport, updateReportInvestigation, rateReport, getReportRating } from '../controllers/ncrController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createReportSchema, assignReportSchema, reviewReportApprovalSchema, rateReportSchema } from '../validations/ncrValidation.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

router.get('/ncr', getReports)
router.post('/ncr', validateRequest(createReportSchema), createReport)
router.post('/ncr/submit', upload.array('evidence_files', 3), createReportSubmit)
router.put('/ncr/:id', validateRequest(createReportSchema), updateReport)
router.put('/ncr/:id/investigation', upload.array('investigation_evidence_files', 3), updateReportInvestigation)
router.put('/ncr/:id/assign', requireRoles(['admin', 'auditor']), validateRequest(assignReportSchema), assignReport)
router.put('/ncr/:id/approval', requireRoles(['admin', 'auditor']), validateRequest(reviewReportApprovalSchema), reviewReportApproval)
router.post('/ncr/:id/rate', validateRequest(rateReportSchema), rateReport)
router.get('/ncr/:id/rating', getReportRating)
router.delete('/ncr/:id', deleteReport)

export default router