import { Router } from 'express'
import { getSimilarCases, getCached, saveSuggestion } from '../controllers/suggestionController.js'

const router = Router()

router.get('/similar/:ncrId', getSimilarCases)
router.get('/cached/:ncrId', getCached)
router.post('/', saveSuggestion)

export default router