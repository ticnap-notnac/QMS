import { createGetHandler, createPostHandler, createDeleteHandler, createPutHandler } from '../lib/crudController.js'
import {
  fetchAllProducts,
  createProduct as createProductService,
  createProductsBulk as createProductsBulkService,
  deleteProduct as deleteProductService,
  updateProduct as updateProductService
} from '../services/productService.js'

export const getProducts = createGetHandler(fetchAllProducts)

export const createProduct = createPostHandler({
  serviceCreateFn: createProductService,
  bodyKey: 'productName'
})

export async function createProductsBulk(req, res) {
  const { products, items } = req.body || {}
  const rawList = Array.isArray(products) ? products : (Array.isArray(items) ? items : null)

  if (!rawList || rawList.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of products to add.' })
  }

  const actorAuthId = req.user?.id || req.auth?.id || null
  const { data, skipped, totalAdded, totalSkipped, error, validationError } = await createProductsBulkService({
    products: rawList,
    actorAuthId
  })

  if (validationError) {
    return res.status(400).json({ error: validationError })
  }
  if (error) {
    return res.status(500).json({ error: error.message || 'Failed to bulk create products.' })
  }

  return res.status(201).json({
    message: `Successfully added ${totalAdded} product${totalAdded === 1 ? '' : 's'}.${totalSkipped > 0 ? ` ${totalSkipped} existing product${totalSkipped === 1 ? '' : 's'} skipped.` : ''}`,
    data,
    skipped,
    totalAdded,
    totalSkipped
  })
}

export const deleteProduct = createDeleteHandler({
  serviceDeleteFn: deleteProductService
})

export const putProduct = createPutHandler({
  serviceUpdateFn: updateProductService,
  bodyKey: 'product_name'
})
