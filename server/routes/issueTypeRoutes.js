import { Router } from 'express'
import { createIssueType, deleteIssueType, getIssueTypes, putIssueType } from '../controllers/issueTypeController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/issue-types', getIssueTypes)
router.post('/issue-types', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), createIssueType)
router.delete('/issue-types/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), deleteIssueType)
router.put('/issue-types/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), putIssueType)

export default router
