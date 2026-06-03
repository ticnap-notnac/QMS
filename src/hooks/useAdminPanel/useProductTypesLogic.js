import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import {
  loadProductTypes as loadProductTypesController,
  createProductType as createProductTypeController,
  deleteProductType as deleteProductTypeController,
} from '@/services/productTypeService'

export default function useProductTypesLogic() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, reload, createItem, deleteItem, error } = useCategoryManager({
    loadFn: loadProductTypesController,
    createFn: createProductTypeController,
    deleteFn: deleteProductTypeController,
  })

  const filtered = useMemo(() => {
    return items.filter((productType) => 
      (productType.product_type_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
  }, [items, searchQuery])

  const openCategoryModal = () => {
    setFormError('')
    setFormMessage('')
    setCategoryInput('')
    setIsCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryInput('')
  }

  const handleSubmitCategory = async (event) => {
    event.preventDefault()
    const nextValue = categoryInput.trim()
    if (!nextValue) {
      setFormError('Please enter a name.')
      return
    }
    try {
      setFormError('')
      await createItem(nextValue)
      setFormMessage(`Added product type ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteProductType = async (productType) => {
    const confirmed = window.confirm(`Delete product type "${productType.product_type_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(productType.id)
      setFormMessage(`Deleted product type ${productType.product_type_name} successfully.`)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const listPanelProps = {
    title: 'Available Product Types',
    items: filtered,
    loading,
    labelKey: 'product_type_name',
    onDelete: handleDeleteProductType,
    deletingId,
    noMatchesText: 'No matches found.'
  }

  const categoryModalProps = {
    isOpen: isCategoryModalOpen,
    onClose: closeCategoryModal,
    onSubmit: handleSubmitCategory,
    title: 'Create New Product Type',
    label: 'Product Type Name',
    value: categoryInput,
    onChange: (event) => setCategoryInput(event.target.value),
    placeholder: 'Enter product type name',
    loading: false,
    error: formError,
    message: formMessage,
    submitLabel: 'Create Product Type',
    helperText: 'Create a product type entry that will be available in the NCR report modal.'
  }

  return {
    searchQuery,
    setSearchQuery,
    reload,
    openCategoryModal,
    error,
    listPanelProps,
    categoryModalProps
  }
}
