import { createGetHandler, createPostHandler, createDeleteHandler } from '../lib/crudController.js'
import {
  fetchAllProductTypes,
  createProductType as createProductTypeService,
  deleteProductType as deleteProductTypeService
} from '../services/productTypeService.js'

export const getProductTypes = createGetHandler(fetchAllProductTypes)

export const createProductType = createPostHandler({
  serviceCreateFn: createProductTypeService,
  bodyKey: 'productTypeName'
})

export const deleteProductType = createDeleteHandler({
  serviceDeleteFn: deleteProductTypeService
})