// server/routes/siteRoutes.js
import { Router } from 'express'
import { getSites } from '../controllers/siteController.js'

const router = Router()

// GET /api/sites — returns all available sites (San Pedro, Makati, etc.)
router.get('/sites', getSites)

export default router
