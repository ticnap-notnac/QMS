import { createGetHandler, createPostHandler, createDeleteHandler, createPutHandler } from '../lib/crudController.js'
import {
  fetchAllPositions,
  createPosition as createPositionService,
  deletePosition as deletePositionService,
  updatePosition as updatePositionService
} from '../services/positionService.js'

export const getPositions = createGetHandler(fetchAllPositions)

export const createPosition = createPostHandler({
  serviceCreateFn: createPositionService,
  bodyKey: 'positionName'
})

export const deletePosition = createDeleteHandler({
  serviceDeleteFn: deletePositionService
})

export const putPosition = createPutHandler({
  serviceUpdateFn: updatePositionService,
  bodyKey: 'position_name'
})
