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
    entityName: 'Non-Conformance Type',
    placeholderText: 'Enter non-conformance type name',
    helperTextText: 'Create a non-conformance type entry that will be available in report forms.'
  })
}
