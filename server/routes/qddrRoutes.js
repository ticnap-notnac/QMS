import { Router } from 'express'
import { createQddr, updateQddr, editQddr, deleteQddr, suggestClauses, getQddrRecurringTrends } from '../controllers/qddrController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createQddrSchema, updateQddrSchema } from '../validations/qddrValidation.js'

const router = Router()

router.post('/qddr', requirePermission(['create_qddr_report', 'create_report']), validateRequest(createQddrSchema), createQddr)
router.get('/qddr/recurring-trends', requirePermission(['view_qddr_reports', 'reports', 'dcc', 'dashboard']), getQddrRecurringTrends)
router.put('/qddr/:id', requirePermission(['accept_decline_report', 'create_qddr_report', 'create_report', 'edit_delete_report']), validateRequest(updateQddrSchema), updateQddr)

// Note: editQddr is a separate route for full form edits, using different roles/validation potentially, but we'll re-use the generic id path
router.put('/qddr/:id/edit', requirePermission('edit_delete_report'), editQddr)
router.delete('/qddr/:id', requirePermission('edit_delete_report'), deleteQddr)

router.post('/qddr/suggest-clauses', requirePermission(['create_qddr_report', 'create_report', 'reports']), suggestClauses)

export default router
