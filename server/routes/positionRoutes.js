import { Router } from 'express'
import { createPosition, deletePosition, getPositions, putPosition } from '../controllers/positionController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/positions', getPositions)
router.post('/positions', requirePermission(['manage_users', 'admin_panel']), createPosition)
router.delete('/positions/:id', requirePermission(['manage_users', 'admin_panel']), deletePosition)
router.put('/positions/:id', requirePermission(['manage_users', 'admin_panel']), putPosition)

export default router
