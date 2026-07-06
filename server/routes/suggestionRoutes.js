import { Router } from 'express'
import { getSimilarCases, getCached, saveSuggestion, generateSuggestion, generateSuggestionFromText, classifyTags, getJobStatus } from '../controllers/suggestionController.js'

const router = Router()

router.get('/similar/:ncrId', getSimilarCases)
router.get('/cached/:ncrId', getCached)
router.post('/', saveSuggestion)
router.post('/generate/:ncrId', generateSuggestion)
router.post('/generate-text', generateSuggestionFromText)
router.get('/job/:jobId', getJobStatus)
router.post('/classify-tags', classifyTags)

export default router