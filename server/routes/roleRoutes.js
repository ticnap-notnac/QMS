import { Router } from 'express'
import { createRole, deleteRole, getRoles, putRole, putRolePermissions, putRolePositions } from '../controllers/roleController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', getRoles)
router.post('/', requirePermission(['manage_roles', 'manage_users', 'admin_panel']), createRole)
router.delete('/:id', requirePermission(['manage_roles', 'manage_users', 'admin_panel']), deleteRole)
router.put('/:id', requirePermission(['manage_roles', 'manage_users', 'admin_panel']), putRole)
router.put('/:id/permissions', requirePermission(['manage_roles', 'manage_users', 'admin_panel']), putRolePermissions)
router.put('/:id/positions', requirePermission(['manage_roles', 'manage_users', 'admin_panel']), putRolePositions)

export default router
