import { Router } from 'express'
import { createPosition, deletePosition, getPositions, putPosition } from '../controllers/positionController.js'

const router = Router()

router.get('/positions', getPositions)
router.post('/positions', createPosition)
router.delete('/positions/:id', deletePosition)
router.put('/positions/:id', putPosition)

export default router
