import { Router } from 'express'
import { createQddr, updateQddr } from '../controllers/qddrController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createQddrSchema, updateQddrSchema } from '../validations/qddrValidation.js'

const router = Router()

router.post('/qddr', requireRoles(['admin', 'auditor', 'qa']), validateRequest(createQddrSchema), createQddr)
router.put('/qddr/:id', requireRoles(['admin', 'auditor', 'qa', 'department_head']), validateRequest(updateQddrSchema), updateQddr)

export default router
