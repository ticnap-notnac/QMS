import { Router } from 'express'
import { createRole, deleteRole, getRoles } from '../controllers/roleController.js'

const router = Router()

router.get('/', getRoles)
router.post('/', createRole)
router.delete('/:id', deleteRole)

export default router