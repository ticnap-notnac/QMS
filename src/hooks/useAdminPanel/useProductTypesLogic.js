import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadProductTypes as loadProductTypesController,
  createProductType as createProductTypeController,
  deleteProductType as deleteProductTypeController
} from '@/services/productTypeService'

export default function useProductTypesLogic() {
  return useAdminCategorySetup({
    loadFn: loadProductTypesController,
    createFn: createProductTypeController,
    deleteFn: deleteProductTypeController,
    labelKey: 'product_type_name',
    entityName: 'Product Type',
    placeholderText: 'Enter product type name',
    helperTextText: 'Create a product type entry that will be available in the NCR report modal.'
  })
}
