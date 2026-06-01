import { Router } from 'express'
import { postDepartment, removeDepartment, getDepartments } from '../controllers/departmentController.js'

const router = Router()

router.get('/', getDepartments)
router.post('/', postDepartment) // was createDepartment
router.delete('/:id', removeDepartment) // was deleteDepartment

export default router