import { Router } from 'express'
import multer from 'multer'
import { assignReport, createReport, deleteReport, getReports, updateReport, createReportSubmit, updateReportInvestigation } from '../controllers/ncrController.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

router.get('/ncr', getReports)
router.post('/ncr', createReport)
router.post('/ncr/submit', upload.single('evidence'), createReportSubmit)
router.put('/ncr/:id', updateReport)
router.put('/ncr/:id/investigation', upload.single('investigation_evidence'), updateReportInvestigation)
router.put('/ncr/:id/assign', assignReport)
router.delete('/ncr/:id', deleteReport)

export default router