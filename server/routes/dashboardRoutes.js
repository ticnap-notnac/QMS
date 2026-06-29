import express from 'express'
import { getResolutionTrends, getPendingRatings } from '../controllers/dashboardController.js'

const router = express.Router()

router.get('/resolution-trends', getResolutionTrends)
router.get('/pending-ratings', getPendingRatings)

export default router
