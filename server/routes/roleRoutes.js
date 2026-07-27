import { Router } from 'express'
import { createRole, deleteRole, getRoles, putRole, putRolePermissions, putRolePositions } from '../controllers/roleController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', getRoles)
router.post('/', requirePermission('manage_roles'), createRole)
router.delete('/:id', requirePermission('manage_roles'), deleteRole)
router.put('/:id', requirePermission('manage_roles'), putRole)
router.put('/:id/permissions', requirePermission('manage_roles'), putRolePermissions)
router.put('/:id/positions', requirePermission('manage_roles'), putRolePositions)

export default router