import { Router } from 'express'
import { createQddr, updateQddr, editQddr, deleteQddr, suggestClauses } from '../controllers/qddrController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createQddrSchema, updateQddrSchema } from '../validations/qddrValidation.js'

const router = Router()

router.post('/qddr', requirePermission('create_report'), validateRequest(createQddrSchema), createQddr)
router.put('/qddr/:id', requirePermission('accept_decline_report'), validateRequest(updateQddrSchema), updateQddr)

// Note: editQddr is a separate route for full form edits, using different roles/validation potentially, but we'll re-use the generic id path
router.put('/qddr/:id/edit', requirePermission('edit_delete_report'), editQddr)
router.delete('/qddr/:id', requirePermission('edit_delete_report'), deleteQddr)

router.post('/qddr/suggest-clauses', requirePermission('manage_iso'), suggestClauses)

export default router
