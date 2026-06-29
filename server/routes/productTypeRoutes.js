import { Router } from 'express'
import { createProductType, deleteProductType, getProductTypes, putProductType } from '../controllers/productTypeController.js'

const router = Router()

router.get('/product-types', getProductTypes)
router.post('/product-types', createProductType)
router.delete('/product-types/:id', deleteProductType)
router.put('/product-types/:id', putProductType)

export default router
