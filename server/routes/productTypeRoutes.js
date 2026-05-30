import { Router } from 'express'
import { createProductType, deleteProductType, getProductTypes } from '../controllers/productTypeController.js'

const router = Router()

router.get('/product-types', getProductTypes)
router.post('/product-types', createProductType)
router.delete('/product-types/:id', deleteProductType)

export default router
