import { Router } from 'express'
import { createLocation, deleteLocation, getLocations, putLocation } from '../controllers/locationController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/locations', getLocations)
router.post('/locations', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), createLocation)
router.delete('/locations/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), deleteLocation)
router.put('/locations/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), putLocation)

export default router
