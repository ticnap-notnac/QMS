import { useState, useMemo } from 'react'
import useCategoryManager from '@/hooks/useCategoryManager'
import { useLookup } from '@/context/LookupContext'
import {
  loadDepartments as loadDepartmentsController,
  createDepartment as createDepartmentController,
  deleteDepartment as deleteDepartmentController,
} from '@/services/departmentService'

export default function useDepartmentsLogic() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const { items, loading, deletingId, reload, createItem, deleteItem, error } = useCategoryManager({
    loadFn: loadDepartmentsController,
    createFn: createDepartmentController,
    deleteFn: deleteDepartmentController,
  })

  const { reloadLookups } = useLookup()

  const filtered = useMemo(() => {
    return items.filter((d) => 
      (d.department_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
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
      await reloadLookups()
      setFormMessage(`Added department ${nextValue} successfully.`)
      closeCategoryModal()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeleteDepartment = async (department) => {
    const confirmed = window.confirm(`Delete department "${department.department_name}"?`)
    if (!confirmed) return
    try {
      setFormError('')
      await deleteItem(department.id)
      await reloadLookups()
      setFormMessage(`Deleted department ${department.department_name} successfully.`)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const listPanelProps = {
    title: 'Available Departments',
    items: filtered,
    loading,
    labelKey: 'department_name',
    onDelete: handleDeleteDepartment,
    deletingId,
    noMatchesText: 'No matches found.'
  }

  const categoryModalProps = {
    isOpen: isCategoryModalOpen,
    onClose: closeCategoryModal,
    onSubmit: handleSubmitCategory,
    title: 'Create New Department',
    label: 'Department Name',
    value: categoryInput,
    onChange: (event) => setCategoryInput(event.target.value),
    placeholder: 'Enter department name',
    loading: false,
    error: formError,
    message: formMessage,
    submitLabel: 'Create Department',
    helperText: 'Create a department entry that will be available in the user modal.'
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
