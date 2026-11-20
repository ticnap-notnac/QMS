import { useState, useMemo, useEffect, useCallback } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'
import { fetchProducts } from '@/services/productService'
import {
  loadProductTypes as loadProductTypesController,
  createProductType as createProductTypeController,
  deleteProductType as deleteProductTypeController,
  updateProductType as updateProductTypeController,
  updateProductTypeProducts
} from '@/services/productTypeService'

export default function useProductTypesLogic() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const [pageError, setPageError] = useState('')
  const [itemToDelete, setItemToDelete] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [toast, setToast] = useState(null)

  const { items, loading, deletingId, creating, reload, createItem, updateItem, deleteItem, error: categoryError } = useCategoryManager({
    loadFn: loadProductTypesController,
    createFn: createProductTypeController,
    updateFn: updateProductTypeController,
    deleteFn: deleteProductTypeController,
  })

  const { products: contextProducts, reloadLookups } = useLookup()
  const [localProducts, setLocalProducts] = useState([])

  const refreshAvailableProducts = useCallback(async () => {
    try {
      const data = await fetchProducts()
      if (Array.isArray(data)) setLocalProducts(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshAvailableProducts()
  }, [refreshAvailableProducts])

  const availableProducts = localProducts.length > 0 ? localProducts : (contextProducts || [])

  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) return items
    return items.filter((pt) => {
      const nameMatch = (pt.product_type_name || '').toLowerCase().includes(q)
      const childMatch = Array.isArray(pt.products) && pt.products.some(p => (p.product_name || '').toLowerCase().includes(q))
      return nameMatch || childMatch
    })
  }, [items, searchQuery])

  const toggleProductSelection = (prodId) => {
    const target = String(prodId)
    setSelectedProductIds((prev) =>
      prev.includes(target) ? prev.filter((id) => id !== target) : [...prev, target]
    )
  }

  const openCategoryModal = () => {
    setFormError('')
    setFormMessage('')
    setCategoryInput('')
    setSelectedProductIds([])
    setEditingItem(null)
    refreshAvailableProducts()
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
    setSelectedProductIds([])
    setEditingItem(null)
  }

  const handleSubmitCategory = async (event) => {
    if (event && event.preventDefault) event.preventDefault()
    const nextValue = (categoryInput || '').trim()
    if (!nextValue) {
      setFormError('Please enter a product type name.')
      return
    }
    try {
      setFormError('')
      let targetProductTypeId = null

      if (editingItem) {
        targetProductTypeId = editingItem.id
        const originalValue = editingItem.product_type_name || ''
        if (nextValue !== originalValue) {
          await updateItem(editingItem.id, nextValue)
        }
      } else {
        const created = await createItem(nextValue)
        targetProductTypeId = Array.isArray(created) ? created[0]?.id : created?.id
      }

      if (targetProductTypeId) {
        await updateProductTypeProducts(targetProductTypeId, selectedProductIds)
      }

      closeCategoryModal()
      if (editingItem) {
        setToast({ message: `Updated product type "${nextValue}" and products successfully.`, type: 'success' })
      } else {
        setToast({ message: `Added product type "${nextValue}" successfully.`, type: 'success' })
      }
      setPageError('')

      await reloadLookups()
      await refreshAvailableProducts()
      await reload()
    } catch (err) {
      setFormError(editingItem ? 'Could not update product type. Please try again.' : 'This product type could not be added. Please try again.')
    }
  }

  const handleDeleteProductType = (pt) => {
    setItemToDelete(pt)
  }

  const confirmDeleteProductType = async () => {
    if (!itemToDelete) return
    const pt = itemToDelete
    try {
      setPageError('')
      await deleteItem(pt.id)
      setItemToDelete(null)
      setToast({ message: `Deleted product type "${pt.product_type_name}" successfully.`, type: 'success' })
      await reloadLookups()
    } catch (err) {
      setToast({ message: err?.message || 'This product type could not be deleted.', type: 'error' })
    }
  }

  const cancelDeleteProductType = () => setItemToDelete(null)

  const confirmDialogProps = {
    isOpen: !!itemToDelete,
    title: 'Delete Product Type',
    message: itemToDelete ? `Are you sure you want to delete product type "${itemToDelete.product_type_name}"?` : '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    isLoading: !!deletingId,
    onConfirm: confirmDeleteProductType,
    onCancel: cancelDeleteProductType,
  }

  const handleEditProductType = (pt) => {
    setFormError('')
    setFormMessage('')
    setCategoryInput(pt.product_type_name || '')
    const existingProdIds = Array.isArray(pt.products) ? pt.products.map((p) => String(p.id)) : []
    setSelectedProductIds(existingProdIds)
    setEditingItem(pt)
    refreshAvailableProducts()
    setIsCategoryModalOpen(true)
  }

  return {
    items,
    filtered,
    loading,
    deletingId,
    creating,
    reload,
    searchQuery,
    setSearchQuery,
    isCategoryModalOpen,
    openCategoryModal,
    closeCategoryModal,
    categoryInput,
    setCategoryInput,
    availableProducts,
    selectedProductIds,
    toggleProductSelection,
    formError,
    formMessage,
    toast,
    setToast,
    pageError,
    error: pageError || categoryError,
    handleSubmitCategory,
    handleDeleteProductType,
    handleEditProductType,
    confirmDialogProps,
    editingItem,
    listPanelProps: {
      title: 'Available Product Types',
      items: filtered,
      loading,
      labelKey: 'product_type_name',
      onEdit: handleEditProductType,
      onDelete: handleDeleteProductType,
      deletingId,
      noMatchesText: 'No matches found.'
    }
  }
}
