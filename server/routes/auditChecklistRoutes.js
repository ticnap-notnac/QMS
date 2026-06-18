import { Router } from 'express'
import {
  getTemplates,
  addTemplate,
  editTemplate,
  removeTemplate,
} from '../controllers/auditChecklistController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/audit-templates', getTemplates)
router.post('/audit-templates', requireRoles(['admin', 'auditor']), addTemplate)
router.put('/audit-templates/:id', requireRoles(['admin', 'auditor']), editTemplate)
router.delete('/audit-templates/:id', requireRoles(['admin', 'auditor']), removeTemplate)

export default router
