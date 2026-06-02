import { Router } from 'express'
import { createCar } from '../controllers/carController.js'

const router = Router()

router.post('/car', createCar)

export default router
