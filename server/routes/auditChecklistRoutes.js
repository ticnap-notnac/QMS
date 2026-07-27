import { Router } from 'express'
import {
  getTemplates,
  addTemplate,
  editTemplate,
  removeTemplate,
} from '../controllers/auditChecklistController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/audit-templates', getTemplates)
router.post('/audit-templates', requirePermission('manage_audit_schedules'), addTemplate)
router.put('/audit-templates/:id', requirePermission('manage_audit_schedules'), editTemplate)
router.delete('/audit-templates/:id', requirePermission('manage_audit_schedules'), removeTemplate)

export default router
