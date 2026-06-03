import { Router } from 'express'
import { createCar, submitCapa, verifyCar } from '../controllers/carController.js'

const router = Router()

router.post('/car', createCar)
router.put('/car/:id/capa', submitCapa)
router.put('/car/:id/verify', verifyCar)

export default router

