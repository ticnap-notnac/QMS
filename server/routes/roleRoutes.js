import { Router } from 'express'
import { createRole, deleteRole, getRoles } from '../controllers/roleController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.use(requireRoles(['admin']))

router.get('/', getRoles)
router.post('/', createRole)
router.delete('/:id', deleteRole)

export default router