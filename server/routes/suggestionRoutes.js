import { Router } from 'express'
import { getSimilarCases, getCached, saveSuggestion, generateSuggestion } from '../controllers/suggestionController.js'

const router = Router()

router.get('/similar/:ncrId', getSimilarCases)
router.get('/cached/:ncrId', getCached)
router.post('/', saveSuggestion)
router.post('/generate/:ncrId', generateSuggestion)

export default router