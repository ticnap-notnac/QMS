import { createGetHandler, createPostHandler, createDeleteHandler, createPutHandler } from '../lib/crudController.js'
import { getRequestActor } from '../lib/requestUtils.js'
import {
  fetchAllProductTypes,
  createProductType as createProductTypeService,
  deleteProductType as deleteProductTypeService,
  updateProductType as updateProductTypeService
} from '../services/productTypeService.js'
import { assignProductsToProductType } from '../services/productService.js'

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

export async function putProductTypeProducts(req, res) {
  const { id } = req.params
  const { productIds } = req.body ?? {}
  const actorAuthId = getRequestActor(req)

  const result = await assignProductsToProductType({
    productTypeId: Number(id),
    productIds: Array.isArray(productIds) ? productIds : [],
    actorAuthId
  })

  if (result.error) {
    return res.status(500).json({ error: result.error.message || result.error })
  }
  return res.json({ success: true })
}