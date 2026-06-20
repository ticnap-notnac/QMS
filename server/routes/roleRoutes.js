import { Router } from 'express'
import { createRole, deleteRole, getRoles } from '../controllers/roleController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js'

const router = Router()

router.get('/', cacheMiddleware, getRoles)
router.post('/', requireRoles(['admin']), createRole)
router.delete('/:id', requireRoles(['admin']), deleteRole)

export default router