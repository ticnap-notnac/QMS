import { Router } from 'express'
import multer from 'multer'
import { assignReport, createReport, createReportSubmit, deleteReport, getReports, reviewReportApproval, updateReport, updateReportInvestigation, rateReport, getReportRating } from '../controllers/ncrController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

router.get('/ncr', getReports)
router.post('/ncr', createReport)
router.post('/ncr/submit', upload.single('evidence'), createReportSubmit)
router.put('/ncr/:id', updateReport)
router.put('/ncr/:id/investigation', upload.single('investigation_evidence'), updateReportInvestigation)
router.put('/ncr/:id/assign', requireRoles(['admin', 'auditor']), assignReport)
router.put('/ncr/:id/approval', requireRoles(['admin', 'auditor']), reviewReportApproval)
router.post('/ncr/:id/rate', rateReport)
router.get('/ncr/:id/rating', getReportRating)
router.delete('/ncr/:id', deleteReport)

export default router