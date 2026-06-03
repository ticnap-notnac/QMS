import { createGetHandler, createPostHandler, createDeleteHandler } from '../lib/crudController.js'
import {
  fetchAllLocations,
  createLocation as createLocationService,
  deleteLocation as deleteLocationService
} from '../services/locationService.js'

export const getLocations = createGetHandler(fetchAllLocations)

export const createLocation = createPostHandler({
  serviceCreateFn: createLocationService,
  bodyKey: 'locationName'
})

export const deleteLocation = createDeleteHandler({
  serviceDeleteFn: deleteLocationService
})
