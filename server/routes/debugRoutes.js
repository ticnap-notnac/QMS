import { Router } from 'express'
import { getDebug } from '../controllers/debugController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', requirePermission('admin_panel'), getDebug)

export default router
