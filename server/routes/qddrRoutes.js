import { Router } from 'express'
import { createQddr } from '../controllers/qddrController.js'

const router = Router()

router.post('/qddr', createQddr)

export default router
