import express from 'express'
import { getComplianceStats, getComplianceTrends } from '../controllers/complianceController.js'

const router = express.Router()

router.get('/', getComplianceStats)
router.get('/trends', getComplianceTrends)

export default router
