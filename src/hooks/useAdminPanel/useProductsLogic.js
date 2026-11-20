import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadProducts as loadProductsController,
  createProduct as createProductController,
  deleteProduct as deleteProductController,
  updateProduct as updateProductController
} from '@/services/productService'

export default function useProductsLogic() {
  return useAdminCategorySetup({
    loadFn: loadProductsController,
    createFn: createProductController,
    updateFn: updateProductController,
    deleteFn: deleteProductController,
    labelKey: 'product_name',
    entityName: 'Product',
    placeholderText: 'Enter product or material name',
    helperTextText: 'Create a product or material entry that can be assigned to a Product Type and selected in CAR reports.'
  })
}
