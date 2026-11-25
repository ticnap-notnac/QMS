import { useState, useEffect, useCallback } from 'react'
import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadProducts as loadProductsController,
  createProduct as createProductController,
  createProductsBulk as createProductsBulkController,
  deleteProduct as deleteProductController,
  updateProduct as updateProductController
} from '@/services/productService'
import { fetchProductTypes } from '@/services/productTypeService'

export default function useProductsLogic() {
  const categoryLogic = useAdminCategorySetup({
    loadFn: loadProductsController,
    createFn: createProductController,
    updateFn: updateProductController,
    deleteFn: deleteProductController,
    labelKey: 'product_name',
    entityName: 'Product',
    placeholderText: 'Enter product or material name',
    helperTextText: 'Create a product or material entry that can be assigned to a Product Type and selected in CAR reports.'
  })

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [productTypes, setProductTypes] = useState([])

  useEffect(() => {
    fetchProductTypes()
      .then((data) => setProductTypes(data || []))
      .catch((err) => console.warn('Failed to load product types for bulk modal:', err))
  }, [])

  const openBulkModal = useCallback(() => {
    setIsBulkModalOpen(true)
  }, [])

  const closeBulkModal = useCallback(() => {
    setIsBulkModalOpen(false)
  }, [])

  const handleBulkSubmit = useCallback(async (productsToAdd) => {
    setBulkLoading(true)
    try {
      const res = await createProductsBulkController(productsToAdd)
      const added = res?.totalAdded ?? productsToAdd.length
      const skipped = res?.totalSkipped ?? 0
      categoryLogic.setToast({
        message: `Successfully added ${added} product${added === 1 ? '' : 's'}.${skipped > 0 ? ` (${skipped} already existing skipped)` : ''}`,
        type: 'success'
      })
      setIsBulkModalOpen(false)
      await categoryLogic.reload()
    } catch (err) {
      categoryLogic.setToast({
        message: err.message || 'Failed to bulk add products. Please check the items and try again.',
        type: 'error'
      })
    } finally {
      setBulkLoading(false)
    }
  }, [categoryLogic])

  return {
    ...categoryLogic,
    isBulkModalOpen,
    openBulkModal,
    closeBulkModal,
    handleBulkSubmit,
    bulkLoading,
    productTypes
  }
}
