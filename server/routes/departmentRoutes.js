import { Router } from 'express'
import { postDepartment, removeDepartment, getDepartments } from '../controllers/departmentController.js'
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js'

const router = Router()

router.get('/', cacheMiddleware, getDepartments)
router.post('/', postDepartment) // was createDepartment
router.delete('/:id', removeDepartment) // was deleteDepartment

export default router