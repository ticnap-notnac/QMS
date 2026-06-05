import { Router } from 'express'
import { createQddr, updateQddr } from '../controllers/qddrController.js'

const router = Router()

router.post('/qddr', createQddr)
router.put('/qddr/:id', updateQddr)

export default router
