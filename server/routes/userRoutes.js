import { Router } from 'express'
import { createUser, deleteUser, getUsers, updateUser, updateUserStatus } from '../controllers/userController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.use(requireRoles(['admin']))

router.get('/', getUsers)
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)
router.patch('/:id/status', updateUserStatus)

export default router