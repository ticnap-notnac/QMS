import { Router } from 'express'
import { createUser, deleteUser, getUsers, updateUser, updateUserStatus } from '../controllers/userController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', getUsers)
router.post('/', requireRoles(['admin']), createUser)
router.put('/:id', requireRoles(['admin']), updateUser)
router.delete('/:id', requireRoles(['admin']), deleteUser)
router.patch('/:id/status', requireRoles(['admin']), updateUserStatus)

export default router