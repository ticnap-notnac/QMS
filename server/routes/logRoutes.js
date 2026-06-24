import { Router } from 'express'
import { getLogs, insertLog, recordLogRead, logClientError } from '../controllers/logController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/', requireRoles(['admin', 'auditor']), getLogs)
router.post('/', insertLog)
router.post('/reads', requireRoles(['admin', 'auditor']), recordLogRead)
router.post('/client-error', logClientError)

export default router