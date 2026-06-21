import { Router } from 'express'
import { createCar, submitCapa, verifyCar, getCarsForClause } from '../controllers/carController.js'
import { suggestClauses } from '../controllers/clauseMatchController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createCarSchema, submitCapaSchema, verifyCarSchema } from '../validations/carValidation.js'

const router = Router()

router.post('/car', requireRoles(['admin', 'auditor']), validateRequest(createCarSchema), createCar)
router.post('/car/suggest-clauses', requireRoles(['admin', 'auditor']), suggestClauses)
router.put('/car/:id/capa', requireRoles(['admin', 'auditor', 'department_head']), validateRequest(submitCapaSchema), submitCapa)
router.put('/car/:id/verify', requireRoles(['admin', 'auditor']), validateRequest(verifyCarSchema), verifyCar)
router.get('/car/clause/:clauseId/cars', getCarsForClause)

export default router
