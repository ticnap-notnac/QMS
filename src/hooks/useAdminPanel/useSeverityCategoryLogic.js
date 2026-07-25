import useAdminCategorySetup from './useAdminCategorySetup'
import {
  loadIssueTypes as loadIssueTypesController,
  createIssueType as createIssueTypeController,
  deleteIssueType as deleteIssueTypeController,
  updateIssueType as updateIssueTypeController
} from '@/services/issueTypeService'

export default function useSeverityCategoryLogic() {
  return useAdminCategorySetup({
    loadFn: loadIssueTypesController,
    createFn: createIssueTypeController,
    updateFn: updateIssueTypeController,
    deleteFn: deleteIssueTypeController,
    labelKey: 'issue_type_name',
    entityName: 'Severity Category',
    placeholderText: 'Enter severity category name',
    helperTextText: 'Create a severity category entry that will be available in report forms.'
  })
}
