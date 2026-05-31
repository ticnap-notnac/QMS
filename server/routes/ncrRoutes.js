import { Router } from 'express'
import multer from 'multer'
import { createReport, deleteReport, getReports, updateReport, createReportSubmit } from '../controllers/ncrController.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

router.get('/ncr', getReports)
router.post('/ncr', createReport)
router.post('/ncr/submit', upload.single('evidence'), createReportSubmit)
router.put('/ncr/:id', updateReport)
router.delete('/ncr/:id', deleteReport)

export default router