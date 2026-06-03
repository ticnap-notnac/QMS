import { Router } from 'express'
import { getLogs, insertLog, recordLogRead } from '../controllers/logController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'

const router = Router()

router.use(requireRoles(['admin', 'auditor']))

router.get('/', getLogs)
router.post('/', insertLog)
router.post('/reads', recordLogRead)

export default router