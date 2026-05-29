import { Router } from 'express'
import { getDebug } from '../controllers/debugController.js'

const router = Router()

router.get('/', getDebug)

export default router
