import { Router } from 'express'
import { postDepartment, removeDepartment, getDepartments, putDepartment } from '../controllers/departmentController.js'

const router = Router()

router.get('/', getDepartments)
router.post('/', postDepartment) // was createDepartment
router.delete('/:id', removeDepartment) // was deleteDepartment
router.put('/:id', putDepartment)

export default router