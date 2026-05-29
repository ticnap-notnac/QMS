import { Router } from 'express'
import { createUser, deleteUser, getUsers } from '../controllers/userController.js'

const router = Router()

router.get('/', getUsers)
router.post('/', createUser)
router.delete('/:id', deleteUser)

export default router