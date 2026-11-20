import { Router } from 'express'
import { createProductType, deleteProductType, getProductTypes, putProductType, putProductTypeProducts } from '../controllers/productTypeController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/product-types', getProductTypes)
router.post('/product-types', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), createProductType)
router.delete('/product-types/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), deleteProductType)
router.put('/product-types/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), putProductType)
router.put('/product-types/:id/products', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), putProductTypeProducts)

export default router
