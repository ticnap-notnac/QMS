import { Router } from 'express'
import { createDepartment, deleteDepartment, getDepartments } from '../controllers/departmentController.js'

const router = Router()

router.get('/', getDepartments)
router.post('/', createDepartment)
router.delete('/:id', deleteDepartment)

export default router