import { Router } from 'express'
import { createReport, deleteReport, getReports, updateReport } from '../controllers/ncrController.js'

const router = Router()

router.get('/ncr', getReports)
router.post('/ncr', createReport)
router.put('/ncr/:id', updateReport)
router.delete('/ncr/:id', deleteReport)

export default router