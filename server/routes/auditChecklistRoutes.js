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
router.post('/audit-templates', requirePermission(['manage_audit_schedules', 'manage_iso', 'audit_tools']), addTemplate)
router.put('/audit-templates/:id', requirePermission(['manage_audit_schedules', 'manage_iso', 'audit_tools']), editTemplate)
router.delete('/audit-templates/:id', requirePermission(['manage_audit_schedules', 'manage_iso', 'audit_tools']), removeTemplate)

export default router
