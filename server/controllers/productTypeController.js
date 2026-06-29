import { createGetHandler, createPostHandler, createDeleteHandler, createPutHandler } from '../lib/crudController.js'
import {
  fetchAllProductTypes,
  createProductType as createProductTypeService,
  deleteProductType as deleteProductTypeService,
  updateProductType as updateProductTypeService
} from '../services/productTypeService.js'

export const getProductTypes = createGetHandler(fetchAllProductTypes)

export const createProductType = createPostHandler({
  serviceCreateFn: createProductTypeService,
  bodyKey: 'productTypeName'
})

export const deleteProductType = createDeleteHandler({
  serviceDeleteFn: deleteProductTypeService
})

export const putProductType = createPutHandler({
  serviceUpdateFn: updateProductTypeService,
  bodyKey: 'product_type_name'
})