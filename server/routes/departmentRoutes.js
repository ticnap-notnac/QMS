import { Router } from 'express'
import { postDepartment, removeDepartment, getDepartments, putDepartment } from '../controllers/departmentController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', getDepartments)
router.post('/', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), postDepartment)
router.delete('/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), removeDepartment)
router.put('/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), putDepartment)

export default router
