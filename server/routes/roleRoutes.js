import { Router } from 'express'
import { createRole, deleteRole, getRoles, putRole, putRolePermissions } from '../controllers/roleController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', getRoles)
router.post('/', requireRoles(['admin']), createRole)
router.delete('/:id', requireRoles(['admin']), deleteRole)
router.put('/:id', requireRoles(['admin']), putRole)
router.put('/:id/permissions', requireRoles(['admin']), putRolePermissions)

export default router