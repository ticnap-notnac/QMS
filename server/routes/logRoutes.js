import { Router } from 'express'
import { getLogs, insertLog, recordLogRead, logClientError } from '../controllers/logController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', requirePermission(['view_logs', 'audit_tools', 'admin_panel']), getLogs)
router.post('/', insertLog)
router.post('/reads', requirePermission(['view_logs', 'audit_tools', 'admin_panel']), recordLogRead)
router.post('/client-error', logClientError)

export default router
