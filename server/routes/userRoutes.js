import { Router } from 'express'
import { createUser, deleteUser, getUsers, updateUser, updateUserStatus } from '../controllers/userController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createUserSchema, updateUserSchema, updateUserStatusSchema } from '../validations/userValidation.js'
const router = Router()

router.get('/', getUsers)
router.post('/', requirePermission('manage_users'), validateRequest(createUserSchema), createUser)
router.put('/:id', requirePermission('manage_users'), validateRequest(updateUserSchema), updateUser)
router.delete('/:id', requirePermission('manage_users'), deleteUser)
router.patch('/:id/status', requirePermission('manage_users'), validateRequest(updateUserStatusSchema), updateUserStatus)

export default router