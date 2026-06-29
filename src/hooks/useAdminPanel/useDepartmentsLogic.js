import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadDepartments as loadDepartmentsController,
  createDepartment as createDepartmentController,
  deleteDepartment as deleteDepartmentController,
  updateDepartment as updateDepartmentController
} from '@/services/departmentService'

export default function useDepartmentsLogic() {
  return useAdminCategorySetup({
    loadFn: loadDepartmentsController,
    createFn: createDepartmentController,
    updateFn: updateDepartmentController,
    deleteFn: deleteDepartmentController,
    labelKey: 'department_name',
    entityName: 'Department',
    placeholderText: 'Enter department name',
    helperTextText: 'Create a department entry that will be available in the user modal.'
  })
}
