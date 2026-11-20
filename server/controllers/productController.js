import { createGetHandler, createPostHandler, createDeleteHandler, createPutHandler } from '../lib/crudController.js'
import {
  fetchAllProducts,
  createProduct as createProductService,
  deleteProduct as deleteProductService,
  updateProduct as updateProductService
} from '../services/productService.js'

export const getProducts = createGetHandler(fetchAllProducts)

export const createProduct = createPostHandler({
  serviceCreateFn: createProductService,
  bodyKey: 'productName'
})

export const deleteProduct = createDeleteHandler({
  serviceDeleteFn: deleteProductService
})

export const putProduct = createPutHandler({
  serviceUpdateFn: updateProductService,
  bodyKey: 'product_name'
})
