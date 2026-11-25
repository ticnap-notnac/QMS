import { Router } from 'express'
import { createProduct, createProductsBulk, deleteProduct, getProducts, putProduct } from '../controllers/productController.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'

const router = Router()

router.get('/products', getProducts)
router.post('/products/bulk', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), createProductsBulk)
router.post('/products', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), createProduct)
router.delete('/products/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), deleteProduct)
router.put('/products/:id', requirePermission(['manage_categories', 'manage_users', 'admin_panel']), putProduct)

export default router
