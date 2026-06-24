import { Router } from 'express'
import { createQddr, updateQddr, editQddr, deleteQddr } from '../controllers/qddrController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createQddrSchema, updateQddrSchema } from '../validations/qddrValidation.js'

const router = Router()

router.post('/qddr', requireRoles(['admin', 'auditor', 'qa']), validateRequest(createQddrSchema), createQddr)
router.put('/qddr/:id', requireRoles(['admin', 'auditor', 'department_head']), validateRequest(updateQddrSchema), updateQddr)

// Note: editQddr is a separate route for full form edits, using different roles/validation potentially, but we'll re-use the generic id path
router.put('/qddr/:id/edit', requireRoles(['admin', 'auditor']), editQddr)
router.delete('/qddr/:id', requireRoles(['admin', 'auditor']), deleteQddr)

export default router
