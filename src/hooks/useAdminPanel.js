import useAddUserLogic from './useAdminPanel/useAddUserLogic'
import useDepartmentsLogic from './useAdminPanel/useDepartmentsLogic'
import useLocationsLogic from './useAdminPanel/useLocationsLogic'
import useProductTypesLogic from './useAdminPanel/useProductTypesLogic'
import useISOStandardsLogic from './useAdminPanel/useISOStandardsLogic'

// Unified entry point hook aggregating all admin panel hooks
export function useAdminPanel({ userRole, userName } = {}) {
  const addUser = useAddUserLogic({ userRole })
  const departments = useDepartmentsLogic({ userRole })
  const locations = useLocationsLogic({ userRole })
  const productTypes = useProductTypesLogic({ userRole })
  const isoStandards = useISOStandardsLogic({ userRole, userName })

  return {
    addUser,
    departments,
    locations,
    productTypes,
    isoStandards
  }
}

// Re-export individual hooks for page-specific imports
export {
  useAddUserLogic,
  useDepartmentsLogic,
  useLocationsLogic,
  useProductTypesLogic,
  useISOStandardsLogic
}
