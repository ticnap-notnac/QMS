import { Router } from 'express'
import { createLocation, deleteLocation, getLocations, putLocation } from '../controllers/locationController.js'

const router = Router()

router.get('/locations', getLocations)
router.post('/locations', createLocation)
router.delete('/locations/:id', deleteLocation)
router.put('/locations/:id', putLocation)

export default router
