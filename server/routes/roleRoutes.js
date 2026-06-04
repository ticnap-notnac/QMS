import { Router } from 'express'
import { createRole, deleteRole, getRoles } from '../controllers/roleController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', getRoles)
router.post('/', requireRoles(['admin']), createRole)
router.delete('/:id', requireRoles(['admin']), deleteRole)

export default router