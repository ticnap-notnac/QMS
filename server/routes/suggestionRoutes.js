import { Router } from 'express'
import { generateSuggestionFromText, classifyTags, describeEvidence, scanLabel, getJobStatus } from '../controllers/suggestionController.js'

const router = Router()

router.post('/generate-text', generateSuggestionFromText)
router.get('/job/:jobId', getJobStatus)
router.post('/classify-tags', classifyTags)
router.post('/describe-evidence', describeEvidence)
router.post('/scan-label', scanLabel)

export default router
