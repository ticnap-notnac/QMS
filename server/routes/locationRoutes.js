import { Router } from 'express'
import { createLocation, deleteLocation, getLocations } from '../controllers/locationController.js'

const router = Router()

router.get('/locations', getLocations)
router.post('/locations', createLocation)
router.delete('/locations/:id', deleteLocation)

export default router
