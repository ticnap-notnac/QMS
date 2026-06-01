import { Router } from 'express'
import { createUser, deleteUser, getUsers, updateUser, updateUserStatus } from '../controllers/userController.js'

const router = Router()

router.get('/', getUsers)
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)
router.patch('/:id/status', updateUserStatus)

export default router