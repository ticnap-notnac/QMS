import { Router } from 'express'
import { createCar, submitCapa, verifyCar, getCarsForClause, getCarById } from '../controllers/carController.js'
import { suggestClauses } from '../controllers/clauseMatchController.js'
import { requireRoles } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createCarSchema, submitCapaSchema, verifyCarSchema } from '../validations/carValidation.js'

const router = Router()

router.post('/car', requireRoles(['admin', 'auditor', 'department manager'], 'create_report'), validateRequest(createCarSchema), createCar)
router.get('/car/:id', getCarById)
router.post('/car/suggest-clauses', requireRoles(['admin', 'auditor'], 'manage_iso'), suggestClauses)
router.put('/car/:id/capa', requireRoles(['admin', 'auditor'], 'submit_capa'), validateRequest(submitCapaSchema), submitCapa)
router.put('/car/:id/verify', requireRoles(['admin', 'auditor', 'warehouse staff', 'checker', 'warehouse checker'], 'verify_car'), validateRequest(verifyCarSchema), verifyCar)
router.get('/car/clause/:clauseId/cars', getCarsForClause)

import { editCar, deleteCar } from '../controllers/carController.js'
router.put('/car/:id', requireRoles(['admin', 'auditor'], 'edit_delete_report'), editCar)
router.delete('/car/:id', requireRoles(['admin', 'auditor'], 'edit_delete_report'), deleteCar)

export default router
