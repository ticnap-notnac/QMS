import { Router } from 'express'
import { createUser, deleteUser, getUsers, updateUser, updateUserStatus, updateTeamRoster } from '../controllers/userController.js'
import { requirePermission, requireRoles } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createUserSchema, updateUserSchema, updateUserStatusSchema, assignTeamRosterSchema } from '../validations/userValidation.js'
const router = Router()

router.get('/', getUsers)
router.post('/', requirePermission(['manage_users', 'admin_panel']), validateRequest(createUserSchema), createUser)
router.patch('/team-roster', requirePermission(['manage_users', 'admin_panel']), validateRequest(assignTeamRosterSchema), updateTeamRoster)
router.put('/:id', requirePermission(['manage_users', 'admin_panel']), validateRequest(updateUserSchema), updateUser)
router.delete('/:id', requirePermission(['manage_users', 'admin_panel']), deleteUser)
router.patch('/:id/status', requireRoles(['team leader', 'admin', 'super admin', 'system administrator'], ['manage_users', 'admin_panel']), validateRequest(updateUserStatusSchema), updateUserStatus)

export default router
