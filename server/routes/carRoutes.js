import { Router } from 'express'
import { createCar, submitCapa, verifyCar, getCarsForClause } from '../controllers/carController.js'
import { suggestClauses } from '../controllers/clauseMatchController.js'

const router = Router()

router.post('/car', createCar)
router.post('/car/suggest-clauses', suggestClauses)
router.put('/car/:id/capa', submitCapa)
router.put('/car/:id/verify', verifyCar)
router.get('/car/clause/:clauseId/cars', getCarsForClause)

export default router
