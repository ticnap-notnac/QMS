import { Router } from 'express'
import { createCar, submitCapa, verifyCar, getCarsForClause, getCarById, editCar, deleteCar, getCarRecurringTrends } from '../controllers/carController.js'
import { suggestClauses } from '../controllers/clauseMatchController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createCarSchema, submitCapaSchema, verifyCarSchema } from '../validations/carValidation.js'

const router = Router()

router.post('/car', requirePermission(['create_car_report', 'create_report']), validateRequest(createCarSchema), createCar)
router.get('/car/recurring-trends', requirePermission(['view_car_reports', 'reports', 'dcc', 'dashboard']), getCarRecurringTrends)
router.get('/car/:id', requirePermission(['view_car_reports', 'reports', 'dcc', 'iso']), getCarById)
router.post('/car/suggest-clauses', requirePermission(['create_car_report', 'create_report', 'reports']), suggestClauses)
router.put('/car/:id/capa', requirePermission('submit_capa'), validateRequest(submitCapaSchema), submitCapa)
router.put('/car/:id/verify', requirePermission('verify_car'), validateRequest(verifyCarSchema), verifyCar)
router.get('/car/clause/:clauseId/cars', requirePermission(['view_car_reports', 'reports', 'dcc', 'iso']), getCarsForClause)

router.put('/car/:id', requirePermission('edit_delete_report'), editCar)
router.delete('/car/:id', requirePermission('edit_delete_report'), deleteCar)

export default router
